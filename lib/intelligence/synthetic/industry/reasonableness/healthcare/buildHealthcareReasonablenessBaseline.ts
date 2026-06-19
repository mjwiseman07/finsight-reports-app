import { stableSnapshotHash } from "../../../../core/hash";
import type {
  IndustryBaseContract,
  IndustryBaselineSource,
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

export const PATH_B_CONSUMED_LAUNCH_KPI_FAMILIES = [
  "net_patient_service_revenue_metric",
  "days_in_accounts_receivable_healthcare_convention",
  "payor_mix_percentages",
  "contractual_allowance_pct_of_gross_charges_by_payor",
  "implicit_price_concession_pct_of_gross_charges",
  "bad_debt_pct_of_net_patient_service_revenue",
  "charity_care_pct_of_gross_revenue",
  "operating_margin_healthcare_convention",
] as const;

export const HEALTHCARE_REASONABLENESS_BASELINE_CATEGORIES = [
  "contractual_allowance_pct_of_gross_charges_by_payor_type",
  "bad_debt_pct_of_net_patient_service_revenue",
  "labor_cost_pct_of_operating_expenses",
  "supplies_pct_of_operating_expenses",
  "dso_ranges",
  "payor_mix_reasonableness",
] as const;

export const HEALTHCARE_REASONABLENESS_LAUNCH_FRAMEWORKS = ["us_gaap"] as const;

export const HEALTHCARE_SAFE_HARBOR_MINIMUM_CELL_SIZE = 11;

export type HealthcareSubClassification = (typeof HEALTHCARE_SUB_CLASSIFICATIONS)[number];
export type HealthcareLaunchKpiFamily = (typeof PATH_B_CONSUMED_LAUNCH_KPI_FAMILIES)[number];
export type HealthcareReasonablenessBaselineCategory =
  (typeof HEALTHCARE_REASONABLENESS_BASELINE_CATEGORIES)[number];
export type HealthcareReasonablenessLaunchFramework =
  (typeof HEALTHCARE_REASONABLENESS_LAUNCH_FRAMEWORKS)[number];

export type HealthcareReasonablenessBaselineStatus =
  | "draft"
  | "in_review"
  | "active"
  | "superseded"
  | "deprecated";

export type ReasonablenessSignalStrength = "external_source_strength" | "internal_research_softer";

export interface BuildHealthcareReasonablenessBaselineInput extends Partial<IndustryBaseContract> {
  baselineTopicIdentifier?: string;
  consumedByKpiFamily?: string;
  baselineSource?: IndustryBaselineSource;
  baselineAuthored?: string;
  externalSourceIsReproducible?: boolean;
  minimumCellSize?: number;
  citationReference?: string;
  reviewerAttestation?: ReviewerAttestation;
  requiresSpecialistReview?: boolean;
  version?: string;
  effectiveFromDate?: string;
  deprecatedFromDate?: string;
  baselineStatus?: HealthcareReasonablenessBaselineStatus;
  priorVersionReferenceId?: string;
  industryReasonablenessComplete?: boolean;
}

export interface SyntheticIndustryReasonableness extends IndustryBaseContract {
  industryReasonablenessId: string;
  industryReasonablenessKey: string;
  baselineTopicIdentifier: string;
  consumedByKpiFamily: string;
  baselineScopedToSubClassification: true;
  baselineSource: IndustryBaselineSource;
  baselineAuthored: string;
  externalSourceIsReproducible: boolean;
  internalResearchRequiresSpecialistReview: true;
  internalResearchCarriesSofterSignalLabel: true;
  signalStrength: ReasonablenessSignalStrength;
  isBaselineNotHardLimit: true;
  flagsAnomaliesForHumanReviewNotErrors: true;
  baselineSourceVisibleToHumanReviewer: true;
  citationReference: string;
  reviewerAttestation: ReviewerAttestation;
  requiresSpecialistReview: boolean;
  moduleSpecialistReviewDefaultIsTrueForHealthcare: true;
  specialistAttestationGovernanceMetadataNotCustomerFacing: true;
  minimumCellSize: number;
  minimumCellSizeSafeHarborDefaultForHealthcare: true;
  version: string;
  effectiveFromDate: string;
  deprecatedFromDate?: string;
  baselineStatus: HealthcareReasonablenessBaselineStatus;
  activeRequiresAttestation: true;
  activeRequiresSpecialistAttestationWhenFlagged: true;
  builderNeverAuthorsContent: true;
  appendOnlyHistory: true;
  launchScope: "path_b";
  consumedByLaunchKpiFamilies: HealthcareLaunchKpiFamily[];
  baselineForFamilyOutsideLaunchScopeFailsClosed: true;
  priorVersionReferenceId: string;
  industryReasonablenessComplete: boolean;
}

export interface BuildHealthcareReasonablenessBaselineResult {
  industryReasonableness: SyntheticIndustryReasonableness | null;
  skipped: boolean;
  warnings: string[];
}

const BASELINE_CATEGORY_TO_KPI_FAMILY: Record<
  HealthcareReasonablenessBaselineCategory,
  HealthcareLaunchKpiFamily
> = {
  contractual_allowance_pct_of_gross_charges_by_payor_type:
    "contractual_allowance_pct_of_gross_charges_by_payor",
  bad_debt_pct_of_net_patient_service_revenue: "bad_debt_pct_of_net_patient_service_revenue",
  labor_cost_pct_of_operating_expenses: "operating_margin_healthcare_convention",
  supplies_pct_of_operating_expenses: "operating_margin_healthcare_convention",
  dso_ranges: "days_in_accounts_receivable_healthcare_convention",
  payor_mix_reasonableness: "payor_mix_percentages",
};

export const PHASE_42P_HEALTHCARE_REASONABLENESS_BLUEPRINT: ReadonlyArray<BuildHealthcareReasonablenessBaselineInput> =
  HEALTHCARE_REASONABLENESS_BASELINE_CATEGORIES.flatMap((baselineTopicIdentifier) =>
    HEALTHCARE_SUB_CLASSIFICATIONS.map((industrySubClassification) => ({
      baselineTopicIdentifier,
      consumedByKpiFamily: BASELINE_CATEGORY_TO_KPI_FAMILY[baselineTopicIdentifier],
      reportingFramework: "us_gaap" as HealthcareReasonablenessLaunchFramework,
      industryClassification: "healthcare",
      industrySubClassification,
      minimumCellSize: HEALTHCARE_SAFE_HARBOR_MINIMUM_CELL_SIZE,
      requiresSpecialistReview: true,
      version: "0.0.0-draft",
      effectiveFromDate: "2026-01-01",
      baselineStatus: "draft" as HealthcareReasonablenessBaselineStatus,
      baselineAuthored: "",
      citationReference: "",
      baselineSource: {
        sourceType: "external" as const,
        externalSourceReference: "",
      },
      priorVersionReferenceId: "",
    })),
  );

const OUTPUT_CLASSIFICATION: RecommendationOutputClassification = "recommendation_for_human_review";
const DEFAULT_PHI_DERIVATION_STATUS: PhiDerivationStatus = "containsPHI";
const HEALTHCARE_INDUSTRY_CLASSIFICATION = "healthcare";

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

function isHealthcareReasonablenessCategory(
  baselineTopicIdentifier: string,
): baselineTopicIdentifier is HealthcareReasonablenessBaselineCategory {
  return (HEALTHCARE_REASONABLENESS_BASELINE_CATEGORIES as readonly string[]).includes(
    baselineTopicIdentifier,
  );
}

function isHealthcareSubClassification(
  industrySubClassification: string,
): industrySubClassification is HealthcareSubClassification {
  return (HEALTHCARE_SUB_CLASSIFICATIONS as readonly string[]).includes(industrySubClassification);
}

function isLaunchKpiFamily(kpiFamily: string): kpiFamily is HealthcareLaunchKpiFamily {
  return (PATH_B_CONSUMED_LAUNCH_KPI_FAMILIES as readonly string[]).includes(kpiFamily);
}

function isHealthcareReasonablenessLaunchFramework(
  reportingFramework: IndustryBaseContract["reportingFramework"],
): reportingFramework is HealthcareReasonablenessLaunchFramework {
  return (HEALTHCARE_REASONABLENESS_LAUNCH_FRAMEWORKS as readonly string[]).includes(reportingFramework);
}

function getConsumedByKpiFamily(input: BuildHealthcareReasonablenessBaselineInput): string {
  if (hasValue(input.consumedByKpiFamily)) {
    return input.consumedByKpiFamily as string;
  }

  if (
    input.baselineTopicIdentifier &&
    isHealthcareReasonablenessCategory(input.baselineTopicIdentifier)
  ) {
    return BASELINE_CATEGORY_TO_KPI_FAMILY[input.baselineTopicIdentifier];
  }

  return "";
}

function getMinimumCellSize(input: BuildHealthcareReasonablenessBaselineInput): number {
  return input.minimumCellSize ?? HEALTHCARE_SAFE_HARBOR_MINIMUM_CELL_SIZE;
}

function getRequiresSpecialistReview(
  input: BuildHealthcareReasonablenessBaselineInput,
  baselineSource: IndustryBaselineSource,
): boolean {
  if (baselineSource.sourceType === "internal_research") {
    return true;
  }

  return input.requiresSpecialistReview ?? true;
}

function getReviewerAttestation(
  input: BuildHealthcareReasonablenessBaselineInput,
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

function validateBaselineSource(baselineSource: IndustryBaselineSource | undefined): string[] {
  const failures: string[] = [];

  if (!baselineSource) {
    failures.push("baselineSource is required");
    return failures;
  }

  if (baselineSource.sourceType === "external") {
    if (!hasValue(baselineSource.externalSourceReference)) {
      failures.push("externalSourceReference is required when sourceType is external");
    }
  }

  if (baselineSource.sourceType === "internal_research") {
    if (!hasValue(baselineSource.methodologyDescription)) {
      failures.push("methodologyDescription is required when sourceType is internal_research");
    }

    if (!hasValue(baselineSource.sampleDescription)) {
      failures.push("sampleDescription is required when sourceType is internal_research");
    }

    if (!hasValue(baselineSource.statisticalBasis)) {
      failures.push("statisticalBasis is required when sourceType is internal_research");
    }

    if (!hasValue(baselineSource.limitations)) {
      failures.push("limitations is required when sourceType is internal_research");
    }
  }

  return failures;
}

function validateLaunchScope(consumedByKpiFamily: string): string[] {
  if (!hasValue(consumedByKpiFamily)) {
    return ["consumedByKpiFamily is required"];
  }

  if (!isLaunchKpiFamily(consumedByKpiFamily)) {
    return [`consumedByKpiFamily ${consumedByKpiFamily} is outside Path B 42N1 launch-scope KPI families`];
  }

  return [];
}

function getSignalStrength(baselineSource: IndustryBaselineSource): ReasonablenessSignalStrength {
  return baselineSource.sourceType === "internal_research"
    ? "internal_research_softer"
    : "external_source_strength";
}

function getBaselineStatus(
  input: BuildHealthcareReasonablenessBaselineInput,
  reviewerAttestation: ReviewerAttestation,
  requiresSpecialistReview: boolean,
): HealthcareReasonablenessBaselineStatus {
  const requestedStatus = input.baselineStatus ?? "draft";

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

function getSharedBase(input: BuildHealthcareReasonablenessBaselineInput): IndustryBaseContract {
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

function collectMissingRequiredIdentifiers(input: BuildHealthcareReasonablenessBaselineInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.baselineTopicIdentifier)) {
    missing.push("baselineTopicIdentifier");
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

function buildHealthcareReasonablenessBaselineKey(
  input: BuildHealthcareReasonablenessBaselineInput,
  baselineStatus: HealthcareReasonablenessBaselineStatus,
  consumedByKpiFamily: string,
  baselineSource: IndustryBaselineSource,
  reviewerAttestation: ReviewerAttestation,
  signalStrength: ReasonablenessSignalStrength,
  minimumCellSize: number,
  requiresSpecialistReview: boolean,
): string {
  return stableSnapshotHash({
    baselineTopicIdentifier: input.baselineTopicIdentifier ?? "",
    consumedByKpiFamily,
    industryClassification: HEALTHCARE_INDUSTRY_CLASSIFICATION,
    industrySubClassification: input.industrySubClassification ?? "",
    baselineScopedToSubClassification: true,
    reportingFramework: input.reportingFramework ?? "",
    baselineSource,
    signalStrength,
    minimumCellSize,
    version: input.version ?? "",
    effectiveFromDate: input.effectiveFromDate ?? "",
    baselineStatus,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    citationReference: input.citationReference ?? "",
    primaryReviewerIdentity: reviewerAttestation.primaryReviewer.identity,
    primaryReviewerReviewDate: reviewerAttestation.primaryReviewer.reviewDate,
    requiresSpecialistReview,
    launchScope: "path_b",
    consumedByLaunchKpiFamilies: [...PATH_B_CONSUMED_LAUNCH_KPI_FAMILIES],
  });
}

function buildHealthcareReasonablenessBaselineId(industryReasonablenessKey: string): string {
  return `synthetic-industry-reasonableness:${stableSnapshotHash({
    industryReasonablenessKey,
    artifactType: "SyntheticIndustryReasonableness",
  })}`;
}

function buildDerivationHash(
  industryReasonablenessKey: string,
  baselineStatus: HealthcareReasonablenessBaselineStatus,
): string {
  return stableSnapshotHash({
    industryReasonablenessKey,
    baselineScopedToSubClassification: true,
    internalResearchRequiresSpecialistReview: true,
    internalResearchCarriesSofterSignalLabel: true,
    isBaselineNotHardLimit: true,
    flagsAnomaliesForHumanReviewNotErrors: true,
    baselineSourceVisibleToHumanReviewer: true,
    baselineForFamilyOutsideLaunchScopeFailsClosed: true,
    minimumCellSizeSafeHarborDefaultForHealthcare: true,
    activeRequiresAttestation: true,
    activeRequiresSpecialistAttestationWhenFlagged: true,
    builderNeverAuthorsContent: true,
    moduleSpecialistReviewDefaultIsTrueForHealthcare: true,
    specialistAttestationGovernanceMetadataNotCustomerFacing: true,
    appendOnlyHistory: true,
    launchScope: "path_b",
    baselineStatus,
  });
}

function getWarnings(
  input: BuildHealthcareReasonablenessBaselineInput,
  baselineStatus: HealthcareReasonablenessBaselineStatus,
  baselineSource: IndustryBaselineSource,
  consumedByKpiFamily: string,
  requiresSpecialistReview: boolean,
  minimumCellSize: number,
  validationFailures: string[],
): string[] {
  const baselineTopicIdentifier = input.baselineTopicIdentifier ?? "";

  return [
    ...getInputArray(input.warnings),
    ...validationFailures.map((failure) => `healthcare reasonableness baseline failed closed: ${failure}`),
    ...(input.baselineStatus === "active" && baselineStatus === "in_review"
      ? [
          requiresSpecialistReview
            ? "healthcare baseline marked active without primary reviewer and specialist attestation; forced to in_review"
            : "baseline marked active without primary reviewer identity and reviewDate; forced to in_review",
        ]
      : []),
    ...(!hasValue(input.baselineAuthored)
      ? ["baselineAuthored is human-authored input; draft structure retained until range content is supplied"]
      : []),
    ...(!hasValue(input.citationReference)
      ? ["citationReference holds a standard/source reference only (e.g., HFMA, MGMA, AHA Hospital Statistics), never reproduced text"]
      : []),
    ...(!isHealthcareReasonablenessCategory(baselineTopicIdentifier)
      ? [`baselineTopicIdentifier ${baselineTopicIdentifier} is outside the healthcare reasonableness baseline library`]
      : []),
    ...(input.reportingFramework && !isHealthcareReasonablenessLaunchFramework(input.reportingFramework)
      ? [`reportingFramework ${input.reportingFramework} is outside the healthcare reasonableness launch framework set`]
      : []),
    ...(baselineSource.sourceType === "internal_research"
      ? ["internal_research baselines carry softer signal strength and require specialist review"]
      : []),
    ...(requiresSpecialistReview && baselineStatus !== "active"
      ? ["healthcare baseline remains non-active until specialistReviewer attestation or complete specialistReviewOptOutJustification"]
      : []),
    "baselineScopedToSubClassification: every healthcare reasonableness baseline is scoped to a specific sub-classification and does not apply across settings",
    ...(minimumCellSize === HEALTHCARE_SAFE_HARBOR_MINIMUM_CELL_SIZE
      ? [`minimumCellSize defaults to Safe Harbor threshold ${HEALTHCARE_SAFE_HARBOR_MINIMUM_CELL_SIZE} for healthcare aggregates`]
      : []),
    ...(consumedByKpiFamily
      ? [`baseline supports KPI family ${consumedByKpiFamily} within Path B 42N1 launch scope`]
      : []),
    "specialist attestation identity and credentials are internal governance provenance and are not customer-facing",
    ...(baselineStatus !== "active"
      ? ["baseline remains draft or in_review until attestation requirements are complete"]
      : []),
    "metadata-only healthcare reasonableness baseline architecture; builder never authors ranges and computes nothing — range calibration against real healthcare data is on the real-data test register",
  ];
}

function isIndustryReasonablenessComplete(
  input: BuildHealthcareReasonablenessBaselineInput,
  baselineStatus: HealthcareReasonablenessBaselineStatus,
  reviewerAttestation: ReviewerAttestation,
  requiresSpecialistReview: boolean,
): boolean {
  if (input.industryReasonablenessComplete !== true || baselineStatus !== "active") {
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

export function buildHealthcareReasonablenessBaseline(
  input: BuildHealthcareReasonablenessBaselineInput,
): BuildHealthcareReasonablenessBaselineResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      industryReasonableness: null,
      skipped: true,
      warnings: [
        `missing required healthcare reasonableness baseline identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const consumedByKpiFamily = getConsumedByKpiFamily(input);
  const baselineSource = input.baselineSource as IndustryBaselineSource;
  const validationFailures = [
    ...validateBaselineSource(input.baselineSource),
    ...validateLaunchScope(consumedByKpiFamily),
  ];

  if (validationFailures.length > 0) {
    return {
      industryReasonableness: null,
      skipped: true,
      warnings: getWarnings(
        input,
        "draft",
        baselineSource ?? { sourceType: "external", externalSourceReference: "" },
        consumedByKpiFamily,
        true,
        getMinimumCellSize(input),
        validationFailures,
      ),
    };
  }

  const requiresSpecialistReview = getRequiresSpecialistReview(input, baselineSource);
  const reviewerAttestation = getReviewerAttestation(input, requiresSpecialistReview);
  const minimumCellSize = getMinimumCellSize(input);
  const baselineStatus = getBaselineStatus(input, reviewerAttestation, requiresSpecialistReview);
  const signalStrength = getSignalStrength(baselineSource);
  const industryReasonablenessKey = buildHealthcareReasonablenessBaselineKey(
    input,
    baselineStatus,
    consumedByKpiFamily,
    baselineSource,
    reviewerAttestation,
    signalStrength,
    minimumCellSize,
    requiresSpecialistReview,
  );
  const base = getSharedBase(input);
  const industryReasonableness: SyntheticIndustryReasonableness = {
    ...base,
    industryReasonablenessId: buildHealthcareReasonablenessBaselineId(industryReasonablenessKey),
    industryReasonablenessKey,
    baselineTopicIdentifier: input.baselineTopicIdentifier as string,
    consumedByKpiFamily,
    baselineScopedToSubClassification: true,
    baselineSource,
    baselineAuthored: input.baselineAuthored ?? "",
    externalSourceIsReproducible: input.externalSourceIsReproducible === true,
    internalResearchRequiresSpecialistReview: true,
    internalResearchCarriesSofterSignalLabel: true,
    signalStrength,
    isBaselineNotHardLimit: true,
    flagsAnomaliesForHumanReviewNotErrors: true,
    baselineSourceVisibleToHumanReviewer: true,
    citationReference: input.citationReference ?? "",
    reviewerAttestation,
    requiresSpecialistReview,
    moduleSpecialistReviewDefaultIsTrueForHealthcare: true,
    specialistAttestationGovernanceMetadataNotCustomerFacing: true,
    minimumCellSize,
    minimumCellSizeSafeHarborDefaultForHealthcare: true,
    version: input.version as string,
    effectiveFromDate: input.effectiveFromDate as string,
    deprecatedFromDate: input.deprecatedFromDate,
    baselineStatus,
    activeRequiresAttestation: true,
    activeRequiresSpecialistAttestationWhenFlagged: true,
    builderNeverAuthorsContent: true,
    appendOnlyHistory: true,
    launchScope: "path_b",
    consumedByLaunchKpiFamilies: [...PATH_B_CONSUMED_LAUNCH_KPI_FAMILIES],
    baselineForFamilyOutsideLaunchScopeFailsClosed: true,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    executable: false,
    derivationHash: buildDerivationHash(industryReasonablenessKey, baselineStatus),
    warnings: getWarnings(
      input,
      baselineStatus,
      baselineSource,
      consumedByKpiFamily,
      requiresSpecialistReview,
      minimumCellSize,
      [],
    ),
    industryReasonablenessComplete: isIndustryReasonablenessComplete(
      input,
      baselineStatus,
      reviewerAttestation,
      requiresSpecialistReview,
    ),
  };

  return {
    industryReasonableness,
    skipped: false,
    warnings: industryReasonableness.warnings,
  };
}
