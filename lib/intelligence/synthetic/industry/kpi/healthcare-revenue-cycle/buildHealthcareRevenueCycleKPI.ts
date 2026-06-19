import { stableSnapshotHash } from "../../../../core/hash";
import type {
  IndustryBaseContract,
  IndustryKpiClassification,
  IndustryTreatmentStatus,
  PhiDerivationStatus,
  RecommendationOutputClassification,
  ReviewerAttestation,
  SpecialistReviewOptOutJustification,
} from "../../contracts";

export const HEALTHCARE_SUB_CLASSIFICATIONS = [
  "healthcare.acute_care_hospital",
  "healthcare.ambulatory_surgery_center",
  "healthcare.skilled_nursing_facility",
  "healthcare.physician_practice",
  "healthcare.home_health_or_hospice",
  "healthcare.other",
] as const;

export const HEALTHCARE_REVENUE_CYCLE_KPI_TOPIC_IDENTIFIERS = [
  "net_patient_service_revenue_metric",
  "days_in_accounts_receivable_healthcare_convention",
  "payor_mix_percentages",
  "contractual_allowance_pct_of_gross_charges_by_payor",
  "implicit_price_concession_pct_of_gross_charges",
  "bad_debt_pct_of_net_patient_service_revenue",
  "charity_care_pct_of_gross_revenue",
  "operating_margin_healthcare_convention",
] as const;

export const HEALTHCARE_REVENUE_CYCLE_LAUNCH_FRAMEWORKS = ["us_gaap"] as const;

export const HEALTHCARE_SAFE_HARBOR_MINIMUM_CELL_SIZE = 11;

export type HealthcareSubClassification = (typeof HEALTHCARE_SUB_CLASSIFICATIONS)[number];
export type HealthcareRevenueCycleKpiTopicIdentifier =
  (typeof HEALTHCARE_REVENUE_CYCLE_KPI_TOPIC_IDENTIFIERS)[number];
export type HealthcareRevenueCycleLaunchFramework =
  (typeof HEALTHCARE_REVENUE_CYCLE_LAUNCH_FRAMEWORKS)[number];
export type HealthcareRevenueCycleKpiStatus = IndustryTreatmentStatus;

export interface BuildHealthcareRevenueCycleKPIInput extends Partial<IndustryBaseContract> {
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
  kpiStatus?: HealthcareRevenueCycleKpiStatus;
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
  belowMinimumCellSizeSuppressedOrRolledUp: true;
  loweringMinimumCellSizeRequiresExpertDetermination: true;
  isRevenueCycleScopeNoClinicalDataRequired: true;
  isFrameworkAware: true;
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
  kpiStatus: HealthcareRevenueCycleKpiStatus;
  activeRequiresAttestation: true;
  activeRequiresSpecialistAttestationWhenFlagged: true;
  builderNeverAuthorsContent: true;
  appendOnlyHistory: true;
  priorVersionReferenceId: string;
  launchScope: "path_b";
  industryKpiComplete: boolean;
}

export interface BuildHealthcareRevenueCycleKPIResult {
  industryKpi: SyntheticIndustryKPI | null;
  skipped: boolean;
  warnings: string[];
}

export const PHASE_42N1_HEALTHCARE_REVENUE_CYCLE_KPI_BLUEPRINT: ReadonlyArray<BuildHealthcareRevenueCycleKPIInput> =
  HEALTHCARE_REVENUE_CYCLE_KPI_TOPIC_IDENTIFIERS.flatMap((kpiTopicIdentifier) =>
    HEALTHCARE_SUB_CLASSIFICATIONS.map((industrySubClassification) => ({
      kpiTopicIdentifier,
      reportingFramework: "us_gaap" as HealthcareRevenueCycleLaunchFramework,
      industryClassification: "healthcare",
      industrySubClassification,
      kpiClassification: "revenueCycle" as IndustryKpiClassification,
      minimumCellSize: HEALTHCARE_SAFE_HARBOR_MINIMUM_CELL_SIZE,
      requiresSpecialistReview: true,
      version: "0.0.0-draft",
      effectiveFromDate: "2026-01-01",
      kpiStatus: "draft" as HealthcareRevenueCycleKpiStatus,
      kpiDefinitionAuthored: "",
      citationReference: "",
      priorVersionReferenceId: "",
    })),
  );

const OUTPUT_CLASSIFICATION: RecommendationOutputClassification = "recommendation_for_human_review";
const DEFAULT_PHI_DERIVATION_STATUS: PhiDerivationStatus = "containsPHI";
const HEALTHCARE_INDUSTRY_CLASSIFICATION = "healthcare";
const REVENUE_CYCLE_KPI_CLASSIFICATION: IndustryKpiClassification = "revenueCycle";

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

function isHealthcareRevenueCycleKpiTopic(
  kpiTopicIdentifier: string,
): kpiTopicIdentifier is HealthcareRevenueCycleKpiTopicIdentifier {
  return (HEALTHCARE_REVENUE_CYCLE_KPI_TOPIC_IDENTIFIERS as readonly string[]).includes(kpiTopicIdentifier);
}

function isHealthcareSubClassification(
  industrySubClassification: string,
): industrySubClassification is HealthcareSubClassification {
  return (HEALTHCARE_SUB_CLASSIFICATIONS as readonly string[]).includes(industrySubClassification);
}

function isHealthcareRevenueCycleLaunchFramework(
  reportingFramework: IndustryBaseContract["reportingFramework"],
): reportingFramework is HealthcareRevenueCycleLaunchFramework {
  return (HEALTHCARE_REVENUE_CYCLE_LAUNCH_FRAMEWORKS as readonly string[]).includes(reportingFramework);
}

function getRequiresSpecialistReview(input: BuildHealthcareRevenueCycleKPIInput): boolean {
  return input.requiresSpecialistReview ?? true;
}

function getReviewerAttestation(
  input: BuildHealthcareRevenueCycleKPIInput,
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

function hasPrimaryReviewerAttestation(reviewerAttestation: ReviewerAttestation): boolean {
  return (
    hasValue(reviewerAttestation.primaryReviewer.identity) &&
    hasValue(reviewerAttestation.primaryReviewer.reviewDate)
  );
}

function hasCompleteSpecialistReviewOptOut(
  justification: SpecialistReviewOptOutJustification | null,
): boolean {
  if (!justification) {
    return false;
  }

  return (
    hasValue(justification.justification) &&
    hasValue(justification.attestor) &&
    hasValue(justification.attestationDate)
  );
}

function hasSpecialistReviewerAttestation(reviewerAttestation: ReviewerAttestation): boolean {
  if (reviewerAttestation.specialistReviewer) {
    const specialistReviewer = reviewerAttestation.specialistReviewer;

    return (
      hasValue(specialistReviewer.identity) &&
      hasValue(specialistReviewer.reviewDate) &&
      specialistReviewer.credentials.length > 0
    );
  }

  return hasCompleteSpecialistReviewOptOut(reviewerAttestation.specialistReviewOptOutJustification);
}

function getMinimumCellSize(input: BuildHealthcareRevenueCycleKPIInput): number {
  return input.minimumCellSize ?? HEALTHCARE_SAFE_HARBOR_MINIMUM_CELL_SIZE;
}

function validateMinimumCellSize(minimumCellSize: number | undefined): string[] {
  if (minimumCellSize === undefined) {
    return [];
  }

  if (minimumCellSize < HEALTHCARE_SAFE_HARBOR_MINIMUM_CELL_SIZE) {
    return [
      `minimumCellSize ${minimumCellSize} is below Safe Harbor default ${HEALTHCARE_SAFE_HARBOR_MINIMUM_CELL_SIZE}; healthcare KPIs must not ship with minimumCellSize of 1`,
    ];
  }

  return [];
}

function getKpiStatus(
  input: BuildHealthcareRevenueCycleKPIInput,
  reviewerAttestation: ReviewerAttestation,
  requiresSpecialistReview: boolean,
): HealthcareRevenueCycleKpiStatus {
  const requestedStatus = input.kpiStatus ?? "draft";

  if (requestedStatus === "active") {
    if (!hasPrimaryReviewerAttestation(reviewerAttestation)) {
      return "in_review";
    }

    if (requiresSpecialistReview && !hasSpecialistReviewerAttestation(reviewerAttestation)) {
      return "in_review";
    }
  }

  if (requestedStatus === "superseded" || requestedStatus === "deprecated") {
    return requestedStatus;
  }

  if (requestedStatus === "active") {
    return "active";
  }

  if (requestedStatus === "in_review") {
    return "in_review";
  }

  return "draft";
}

function getSharedBase(input: BuildHealthcareRevenueCycleKPIInput): IndustryBaseContract {
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

function collectMissingRequiredIdentifiers(input: BuildHealthcareRevenueCycleKPIInput): string[] {
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

function collectValidationFailures(input: BuildHealthcareRevenueCycleKPIInput): string[] {
  const failures: string[] = [];
  const kpiTopicIdentifier = input.kpiTopicIdentifier ?? "";

  if (input.reportingFramework && !isHealthcareRevenueCycleLaunchFramework(input.reportingFramework)) {
    failures.push("reportingFramework must be us_gaap for healthcare revenue-cycle launch scope");
  }

  if (hasValue(kpiTopicIdentifier) && !isHealthcareRevenueCycleKpiTopic(kpiTopicIdentifier)) {
    failures.push(`kpiTopicIdentifier ${kpiTopicIdentifier} is outside the healthcare revenue-cycle KPI library`);
  }

  if (
    input.kpiClassification !== undefined &&
    input.kpiClassification !== REVENUE_CYCLE_KPI_CLASSIFICATION
  ) {
    failures.push("kpiClassification must be revenueCycle for healthcare revenue-cycle KPIs; operational KPIs are deferred to 42N2");
  }

  failures.push(...validateMinimumCellSize(input.minimumCellSize));

  return failures;
}

function buildHealthcareRevenueCycleKPIKey(
  input: BuildHealthcareRevenueCycleKPIInput,
  kpiStatus: HealthcareRevenueCycleKpiStatus,
  reviewerAttestation: ReviewerAttestation,
  minimumCellSize: number,
  requiresSpecialistReview: boolean,
): string {
  return stableSnapshotHash({
    kpiTopicIdentifier: input.kpiTopicIdentifier ?? "",
    industryClassification: HEALTHCARE_INDUSTRY_CLASSIFICATION,
    industrySubClassification: input.industrySubClassification ?? "",
    reportingFramework: input.reportingFramework ?? "",
    kpiClassification: REVENUE_CYCLE_KPI_CLASSIFICATION,
    minimumCellSize,
    version: input.version ?? "",
    effectiveFromDate: input.effectiveFromDate ?? "",
    kpiStatus,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    citationReference: input.citationReference ?? "",
    primaryReviewerIdentity: reviewerAttestation.primaryReviewer.identity,
    primaryReviewerReviewDate: reviewerAttestation.primaryReviewer.reviewDate,
    requiresSpecialistReview,
    launchScope: "path_b",
  });
}

function buildHealthcareRevenueCycleKPIId(industryKpiKey: string): string {
  return `synthetic-industry-kpi:${stableSnapshotHash({
    industryKpiKey,
    artifactType: "SyntheticIndustryKPI",
  })}`;
}

function buildDerivationHash(
  industryKpiKey: string,
  kpiStatus: HealthcareRevenueCycleKpiStatus,
): string {
  return stableSnapshotHash({
    industryKpiKey,
    activeRequiresAttestation: true,
    activeRequiresSpecialistAttestationWhenFlagged: true,
    builderNeverAuthorsContent: true,
    isDefinitionNotComputation: true,
    isFrameworkAware: true,
    isRevenueCycleScopeNoClinicalDataRequired: true,
    minimumCellSizeSafeHarborDefaultForHealthcare: true,
    containsCopyrightedText: false,
    moduleSpecialistReviewDefaultIsTrueForHealthcare: true,
    specialistAttestationGovernanceMetadataNotCustomerFacing: true,
    appendOnlyHistory: true,
    launchScope: "path_b",
    kpiStatus,
  });
}

function getWarnings(
  input: BuildHealthcareRevenueCycleKPIInput,
  kpiStatus: HealthcareRevenueCycleKpiStatus,
  reviewerAttestation: ReviewerAttestation,
  requiresSpecialistReview: boolean,
  minimumCellSize: number,
  validationFailures: string[],
): string[] {
  const kpiTopicIdentifier = input.kpiTopicIdentifier ?? "";

  return [
    ...getInputArray(input.warnings),
    ...validationFailures.map((failure) => `healthcare revenue-cycle KPI failed closed: ${failure}`),
    ...(input.kpiStatus === "active" && kpiStatus === "in_review"
      ? [
          requiresSpecialistReview
            ? "healthcare KPI marked active without primary reviewer and specialist attestation; forced to in_review"
            : "KPI marked active without primary reviewer identity and reviewDate; forced to in_review",
        ]
      : []),
    ...(!hasValue(input.kpiDefinitionAuthored)
      ? ["kpiDefinitionAuthored is human-authored input; draft structure retained until definition content is supplied"]
      : []),
    ...(!hasValue(input.citationReference)
      ? ["citationReference holds a standard/source reference only, never reproduced text"]
      : []),
    ...(!isHealthcareRevenueCycleKpiTopic(kpiTopicIdentifier)
      ? [`kpiTopicIdentifier ${kpiTopicIdentifier} is outside the healthcare revenue-cycle KPI topic library`]
      : []),
    ...(input.reportingFramework && !isHealthcareRevenueCycleLaunchFramework(input.reportingFramework)
      ? [`reportingFramework ${input.reportingFramework} is outside the healthcare revenue-cycle launch framework set`]
      : []),
    ...(requiresSpecialistReview &&
    !hasSpecialistReviewerAttestation(reviewerAttestation) &&
    kpiStatus !== "active"
      ? ["requiresSpecialistReview healthcare KPI remains non-active until specialistReviewer attestation or complete specialistReviewOptOutJustification"]
      : []),
    ...(minimumCellSize === HEALTHCARE_SAFE_HARBOR_MINIMUM_CELL_SIZE
      ? [`minimumCellSize defaults to Safe Harbor threshold ${HEALTHCARE_SAFE_HARBOR_MINIMUM_CELL_SIZE}; aggregates below threshold are suppressed or rolled up`]
      : []),
    "lowering minimumCellSize below Safe Harbor default requires Expert Determination attestation by a qualified statistician",
    "operational/clinical KPIs requiring census or case-mix data are deferred to 42N2",
    "specialist attestation identity and credentials are internal governance provenance and are not customer-facing",
    ...(kpiStatus !== "active"
      ? ["KPI remains draft or in_review until attestation requirements are complete"]
      : []),
    "metadata-only healthcare revenue-cycle KPI definition library structure; builder never authors content and computes no metric values — computation against real data is downstream and on the real-data test register",
  ];
}

function isIndustryKpiComplete(
  input: BuildHealthcareRevenueCycleKPIInput,
  kpiStatus: HealthcareRevenueCycleKpiStatus,
  reviewerAttestation: ReviewerAttestation,
  requiresSpecialistReview: boolean,
): boolean {
  if (input.industryKpiComplete !== true || kpiStatus !== "active") {
    return false;
  }

  if (!hasPrimaryReviewerAttestation(reviewerAttestation)) {
    return false;
  }

  if (requiresSpecialistReview && !hasSpecialistReviewerAttestation(reviewerAttestation)) {
    return false;
  }

  return true;
}

export function buildHealthcareRevenueCycleKPI(
  input: BuildHealthcareRevenueCycleKPIInput,
): BuildHealthcareRevenueCycleKPIResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      industryKpi: null,
      skipped: true,
      warnings: [
        `missing required healthcare revenue-cycle KPI identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const validationFailures = collectValidationFailures(input);

  if (validationFailures.length > 0) {
    return {
      industryKpi: null,
      skipped: true,
      warnings: getWarnings(
        input,
        "draft",
        getReviewerAttestation(input, true),
        true,
        getMinimumCellSize(input),
        validationFailures,
      ),
    };
  }

  const requiresSpecialistReview = getRequiresSpecialistReview(input);
  const reviewerAttestation = getReviewerAttestation(input, requiresSpecialistReview);
  const minimumCellSize = getMinimumCellSize(input);
  const kpiStatus = getKpiStatus(input, reviewerAttestation, requiresSpecialistReview);
  const industryKpiKey = buildHealthcareRevenueCycleKPIKey(
    input,
    kpiStatus,
    reviewerAttestation,
    minimumCellSize,
    requiresSpecialistReview,
  );
  const base = getSharedBase(input);
  const industryKpi: SyntheticIndustryKPI = {
    ...base,
    industryKpiId: buildHealthcareRevenueCycleKPIId(industryKpiKey),
    industryKpiKey,
    kpiTopicIdentifier: input.kpiTopicIdentifier as string,
    kpiDefinitionAuthored: input.kpiDefinitionAuthored ?? "",
    kpiClassification: REVENUE_CYCLE_KPI_CLASSIFICATION,
    minimumCellSize,
    minimumCellSizeSafeHarborDefaultForHealthcare: true,
    belowMinimumCellSizeSuppressedOrRolledUp: true,
    loweringMinimumCellSizeRequiresExpertDetermination: true,
    isRevenueCycleScopeNoClinicalDataRequired: true,
    isFrameworkAware: true,
    isDefinitionNotComputation: true,
    citationReference: input.citationReference ?? "",
    containsCopyrightedText: false,
    reviewerAttestation,
    requiresSpecialistReview,
    moduleSpecialistReviewDefaultIsTrueForHealthcare: true,
    specialistAttestationGovernanceMetadataNotCustomerFacing: true,
    version: input.version as string,
    effectiveFromDate: input.effectiveFromDate as string,
    deprecatedFromDate: input.deprecatedFromDate,
    kpiStatus,
    activeRequiresAttestation: true,
    activeRequiresSpecialistAttestationWhenFlagged: true,
    builderNeverAuthorsContent: true,
    appendOnlyHistory: true,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    launchScope: "path_b",
    executable: false,
    derivationHash: buildDerivationHash(industryKpiKey, kpiStatus),
    warnings: getWarnings(
      input,
      kpiStatus,
      reviewerAttestation,
      requiresSpecialistReview,
      minimumCellSize,
      [],
    ),
    industryKpiComplete: isIndustryKpiComplete(
      input,
      kpiStatus,
      reviewerAttestation,
      requiresSpecialistReview,
    ),
  };

  return {
    industryKpi,
    skipped: false,
    warnings: industryKpi.warnings,
  };
}
