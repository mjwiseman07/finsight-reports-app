import { stableSnapshotHash } from "../../../../core/hash";
import type {
  IndustryBaseContract,
  IndustryBaselineSource,
  PhiDerivationStatus,
  RecommendationOutputClassification,
  ReviewerAttestation,
} from "../../contracts";
import { GENERIC_KPI_TOPIC_IDENTIFIERS, type GenericKpiTopicIdentifier } from "../../kpi/generic/buildGenericKPI";

export const GENERIC_REASONABLENESS_BASELINE_CATEGORIES = [
  "gross_margin_ranges_by_smb_segment",
  "payroll_to_revenue_ratios_by_smb_segment",
  "inventory_turnover_ranges",
  "dso_ranges_by_smb_segment",
  "overhead_to_revenue_ratios",
] as const;

export const PATH_A_CONSUMED_LAUNCH_KPI_FAMILIES: readonly GenericKpiTopicIdentifier[] =
  GENERIC_KPI_TOPIC_IDENTIFIERS;

export const GENERIC_REASONABLENESS_LAUNCH_FRAMEWORKS = [
  "us_gaap",
  "ifrs_for_smes",
  "ifrs_iasb",
  "ifrs_eu",
] as const;

export type GenericReasonablenessBaselineCategory =
  (typeof GENERIC_REASONABLENESS_BASELINE_CATEGORIES)[number];

export type GenericReasonablenessLaunchFramework =
  (typeof GENERIC_REASONABLENESS_LAUNCH_FRAMEWORKS)[number];

export type GenericReasonablenessBaselineStatus =
  | "draft"
  | "in_review"
  | "active"
  | "superseded"
  | "deprecated";

export type ReasonablenessSignalStrength = "external_source_strength" | "internal_research_softer";

export interface BuildGenericReasonablenessBaselineInput extends Partial<IndustryBaseContract> {
  baselineTopicIdentifier?: string;
  consumedByKpiFamily?: string;
  baselineSource?: IndustryBaselineSource;
  baselineAuthored?: string;
  externalSourceIsReproducible?: boolean;
  citationReference?: string;
  reviewerAttestation?: ReviewerAttestation;
  version?: string;
  effectiveFromDate?: string;
  deprecatedFromDate?: string;
  baselineStatus?: GenericReasonablenessBaselineStatus;
  priorVersionReferenceId?: string;
  industryReasonablenessComplete?: boolean;
}

export interface SyntheticIndustryReasonableness extends IndustryBaseContract {
  industryReasonablenessId: string;
  industryReasonablenessKey: string;
  baselineTopicIdentifier: string;
  consumedByKpiFamily: string;
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
  version: string;
  effectiveFromDate: string;
  deprecatedFromDate?: string;
  baselineStatus: GenericReasonablenessBaselineStatus;
  activeRequiresAttestation: true;
  builderNeverAuthorsContent: true;
  appendOnlyHistory: true;
  launchScope: "path_a";
  consumedByLaunchKpiFamilies: GenericKpiTopicIdentifier[];
  baselineForFamilyOutsideLaunchScopeFailsClosed: true;
  priorVersionReferenceId: string;
  industryReasonablenessComplete: boolean;
}

export interface BuildGenericReasonablenessBaselineResult {
  industryReasonableness: SyntheticIndustryReasonableness | null;
  skipped: boolean;
  warnings: string[];
}

const BASELINE_CATEGORY_TO_KPI_FAMILY: Record<
  GenericReasonablenessBaselineCategory,
  GenericKpiTopicIdentifier
> = {
  gross_margin_ranges_by_smb_segment: "gross_margin_percent",
  payroll_to_revenue_ratios_by_smb_segment: "revenue_per_employee",
  inventory_turnover_ranges: "days_inventory_outstanding",
  dso_ranges_by_smb_segment: "days_sales_outstanding",
  overhead_to_revenue_ratios: "operating_margin_percent",
};

export const PHASE_42L_GENERIC_REASONABLENESS_BLUEPRINT: ReadonlyArray<BuildGenericReasonablenessBaselineInput> =
  GENERIC_REASONABLENESS_BASELINE_CATEGORIES.flatMap((baselineTopicIdentifier) =>
    GENERIC_REASONABLENESS_LAUNCH_FRAMEWORKS.map((reportingFramework) => ({
      baselineTopicIdentifier,
      consumedByKpiFamily: BASELINE_CATEGORY_TO_KPI_FAMILY[baselineTopicIdentifier],
      reportingFramework,
      industryClassification: "generic",
      industrySubClassification: "generic.default",
      version: "0.0.0-draft",
      effectiveFromDate: "2026-01-01",
      baselineStatus: "draft" as GenericReasonablenessBaselineStatus,
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
const GENERIC_INDUSTRY_CLASSIFICATION = "generic";
const GENERIC_INDUSTRY_SUB_CLASSIFICATION = "generic.default";

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

function isGenericReasonablenessCategory(
  baselineTopicIdentifier: string,
): baselineTopicIdentifier is GenericReasonablenessBaselineCategory {
  return (GENERIC_REASONABLENESS_BASELINE_CATEGORIES as readonly string[]).includes(baselineTopicIdentifier);
}

function isLaunchKpiFamily(kpiFamily: string): kpiFamily is GenericKpiTopicIdentifier {
  return (PATH_A_CONSUMED_LAUNCH_KPI_FAMILIES as readonly string[]).includes(kpiFamily);
}

function isGenericReasonablenessLaunchFramework(
  reportingFramework: IndustryBaseContract["reportingFramework"],
): reportingFramework is GenericReasonablenessLaunchFramework {
  return (GENERIC_REASONABLENESS_LAUNCH_FRAMEWORKS as readonly string[]).includes(reportingFramework);
}

function getConsumedByKpiFamily(input: BuildGenericReasonablenessBaselineInput): string {
  if (hasValue(input.consumedByKpiFamily)) {
    return input.consumedByKpiFamily as string;
  }

  if (input.baselineTopicIdentifier && isGenericReasonablenessCategory(input.baselineTopicIdentifier)) {
    return BASELINE_CATEGORY_TO_KPI_FAMILY[input.baselineTopicIdentifier];
  }

  return "";
}

function getReviewerAttestation(input: BuildGenericReasonablenessBaselineInput): ReviewerAttestation {
  return (
    input.reviewerAttestation ?? {
      primaryReviewer: {
        identity: "",
        credentials: [],
        reviewDate: "",
        scope: "",
      },
      specialistReviewRequired: input.baselineSource?.sourceType === "internal_research",
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

function hasSpecialistReviewForInternalResearch(reviewerAttestation: ReviewerAttestation): boolean {
  return (
    reviewerAttestation.specialistReviewer !== null ||
    reviewerAttestation.specialistReviewOptOutJustification !== null
  );
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
    return [`consumedByKpiFamily ${consumedByKpiFamily} is outside Path A launch-scope KPI families`];
  }

  return [];
}

function getSignalStrength(baselineSource: IndustryBaselineSource): ReasonablenessSignalStrength {
  return baselineSource.sourceType === "internal_research"
    ? "internal_research_softer"
    : "external_source_strength";
}

function requiresSpecialistReview(baselineSource: IndustryBaselineSource): boolean {
  return baselineSource.sourceType === "internal_research";
}

function getBaselineStatus(
  input: BuildGenericReasonablenessBaselineInput,
  reviewerAttestation: ReviewerAttestation,
  baselineSource: IndustryBaselineSource,
): GenericReasonablenessBaselineStatus {
  const requestedStatus = input.baselineStatus ?? "draft";

  if (requestedStatus === "active") {
    if (!hasPrimaryReviewerAttestation(reviewerAttestation)) {
      return "in_review";
    }

    if (
      baselineSource.sourceType === "internal_research" &&
      !hasSpecialistReviewForInternalResearch(reviewerAttestation)
    ) {
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

function getSharedBase(input: BuildGenericReasonablenessBaselineInput): IndustryBaseContract {
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
    industryClassification: GENERIC_INDUSTRY_CLASSIFICATION,
    industrySubClassification: GENERIC_INDUSTRY_SUB_CLASSIFICATION,
    industryStatus: input.industryStatus ?? "active",
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

function collectMissingRequiredIdentifiers(input: BuildGenericReasonablenessBaselineInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.baselineTopicIdentifier)) {
    missing.push("baselineTopicIdentifier");
  }

  if (!input.reportingFramework) {
    missing.push("reportingFramework");
  }

  if (
    hasValue(input.industryClassification) &&
    input.industryClassification !== GENERIC_INDUSTRY_CLASSIFICATION
  ) {
    missing.push("industryClassification must be generic");
  }

  if (
    hasValue(input.industrySubClassification) &&
    input.industrySubClassification !== GENERIC_INDUSTRY_SUB_CLASSIFICATION
  ) {
    missing.push("industrySubClassification must be generic.default");
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

function buildGenericReasonablenessBaselineKey(
  input: BuildGenericReasonablenessBaselineInput,
  baselineStatus: GenericReasonablenessBaselineStatus,
  consumedByKpiFamily: string,
  baselineSource: IndustryBaselineSource,
  reviewerAttestation: ReviewerAttestation,
  signalStrength: ReasonablenessSignalStrength,
): string {
  return stableSnapshotHash({
    baselineTopicIdentifier: input.baselineTopicIdentifier ?? "",
    consumedByKpiFamily,
    industryClassification: GENERIC_INDUSTRY_CLASSIFICATION,
    industrySubClassification: GENERIC_INDUSTRY_SUB_CLASSIFICATION,
    reportingFramework: input.reportingFramework ?? "",
    baselineSource,
    signalStrength,
    version: input.version ?? "",
    effectiveFromDate: input.effectiveFromDate ?? "",
    baselineStatus,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    citationReference: input.citationReference ?? "",
    primaryReviewerIdentity: reviewerAttestation.primaryReviewer.identity,
    primaryReviewerReviewDate: reviewerAttestation.primaryReviewer.reviewDate,
    launchScope: "path_a",
    consumedByLaunchKpiFamilies: [...PATH_A_CONSUMED_LAUNCH_KPI_FAMILIES],
  });
}

function buildGenericReasonablenessBaselineId(industryReasonablenessKey: string): string {
  return `synthetic-industry-reasonableness:${stableSnapshotHash({
    industryReasonablenessKey,
    artifactType: "SyntheticIndustryReasonableness",
  })}`;
}

function buildDerivationHash(
  industryReasonablenessKey: string,
  baselineStatus: GenericReasonablenessBaselineStatus,
): string {
  return stableSnapshotHash({
    industryReasonablenessKey,
    internalResearchRequiresSpecialistReview: true,
    internalResearchCarriesSofterSignalLabel: true,
    isBaselineNotHardLimit: true,
    flagsAnomaliesForHumanReviewNotErrors: true,
    baselineSourceVisibleToHumanReviewer: true,
    baselineForFamilyOutsideLaunchScopeFailsClosed: true,
    activeRequiresAttestation: true,
    builderNeverAuthorsContent: true,
    appendOnlyHistory: true,
    launchScope: "path_a",
    baselineStatus,
  });
}

function getWarnings(
  input: BuildGenericReasonablenessBaselineInput,
  baselineStatus: GenericReasonablenessBaselineStatus,
  baselineSource: IndustryBaselineSource,
  consumedByKpiFamily: string,
  validationFailures: string[],
): string[] {
  const baselineTopicIdentifier = input.baselineTopicIdentifier ?? "";

  return [
    ...getInputArray(input.warnings),
    ...validationFailures.map((failure) => `reasonableness baseline failed closed: ${failure}`),
    ...(input.baselineStatus === "active" && baselineStatus === "in_review"
      ? [
          baselineSource.sourceType === "internal_research"
            ? "internal_research baseline marked active without primary reviewer and specialist attestation; forced to in_review"
            : "baseline marked active without primary reviewer identity and reviewDate; forced to in_review",
        ]
      : []),
    ...(!hasValue(input.baselineAuthored)
      ? ["baselineAuthored is human-authored input; draft structure retained until range content is supplied"]
      : []),
    ...(!hasValue(input.citationReference)
      ? ["citationReference holds a standard/source reference only, never reproduced text"]
      : []),
    ...(!isGenericReasonablenessCategory(baselineTopicIdentifier)
      ? [`baselineTopicIdentifier ${baselineTopicIdentifier} is outside the generic reasonableness baseline library`]
      : []),
    ...(input.reportingFramework && !isGenericReasonablenessLaunchFramework(input.reportingFramework)
      ? [`reportingFramework ${input.reportingFramework} is outside the generic reasonableness launch framework set`]
      : []),
    ...(baselineSource.sourceType === "internal_research"
      ? ["internal_research baselines carry softer signal strength and require specialist review"]
      : []),
    ...(baselineStatus !== "active"
      ? ["baseline remains draft or in_review until attestation requirements are complete"]
      : []),
    ...(consumedByKpiFamily
      ? [`baseline supports KPI family ${consumedByKpiFamily} within Path A launch scope`]
      : []),
    "metadata-only generic reasonableness baseline architecture; builder never authors ranges and computes nothing — range calibration against real generic-SMB data is on the real-data test register",
  ];
}

export function buildGenericReasonablenessBaseline(
  input: BuildGenericReasonablenessBaselineInput,
): BuildGenericReasonablenessBaselineResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      industryReasonableness: null,
      skipped: true,
      warnings: [`missing required generic reasonableness baseline identifiers: ${missingRequiredIdentifiers.join(", ")}`],
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
        validationFailures,
      ),
    };
  }

  const reviewerAttestation = getReviewerAttestation(input);
  const baselineStatus = getBaselineStatus(input, reviewerAttestation, baselineSource);
  const signalStrength = getSignalStrength(baselineSource);
  const industryReasonablenessKey = buildGenericReasonablenessBaselineKey(
    input,
    baselineStatus,
    consumedByKpiFamily,
    baselineSource,
    reviewerAttestation,
    signalStrength,
  );
  const base = getSharedBase(input);
  const industryReasonableness: SyntheticIndustryReasonableness = {
    ...base,
    industryReasonablenessId: buildGenericReasonablenessBaselineId(industryReasonablenessKey),
    industryReasonablenessKey,
    baselineTopicIdentifier: input.baselineTopicIdentifier as string,
    consumedByKpiFamily,
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
    requiresSpecialistReview: requiresSpecialistReview(baselineSource),
    version: input.version as string,
    effectiveFromDate: input.effectiveFromDate as string,
    deprecatedFromDate: input.deprecatedFromDate,
    baselineStatus,
    activeRequiresAttestation: true,
    builderNeverAuthorsContent: true,
    appendOnlyHistory: true,
    launchScope: "path_a",
    consumedByLaunchKpiFamilies: [...PATH_A_CONSUMED_LAUNCH_KPI_FAMILIES],
    baselineForFamilyOutsideLaunchScopeFailsClosed: true,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    executable: false,
    derivationHash: buildDerivationHash(industryReasonablenessKey, baselineStatus),
    warnings: getWarnings(input, baselineStatus, baselineSource, consumedByKpiFamily, []),
    industryReasonablenessComplete:
      input.industryReasonablenessComplete === true &&
      baselineStatus === "active" &&
      hasPrimaryReviewerAttestation(reviewerAttestation) &&
      (baselineSource.sourceType !== "internal_research" ||
        hasSpecialistReviewForInternalResearch(reviewerAttestation)),
  };

  return {
    industryReasonableness,
    skipped: false,
    warnings: industryReasonableness.warnings,
  };
}
