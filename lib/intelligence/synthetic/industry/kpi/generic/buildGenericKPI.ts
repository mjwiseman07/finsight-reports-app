import { stableSnapshotHash } from "../../../../core/hash";
import type {
  IndustryBaseContract,
  IndustryKpiClassification,
  PhiDerivationStatus,
  RecommendationOutputClassification,
  ReviewerAttestation,
} from "../../contracts";

export const GENERIC_KPI_TOPIC_IDENTIFIERS = [
  "gross_margin_percent",
  "operating_margin_percent",
  "days_sales_outstanding",
  "days_payable_outstanding",
  "days_inventory_outstanding",
  "cash_conversion_cycle",
  "current_ratio",
  "quick_ratio",
  "working_capital",
  "revenue_per_employee",
] as const;

export const GENERIC_KPI_LAUNCH_FRAMEWORKS = [
  "us_gaap",
  "ifrs_for_smes",
  "ifrs_iasb",
  "ifrs_eu",
] as const;

export type GenericKpiTopicIdentifier = (typeof GENERIC_KPI_TOPIC_IDENTIFIERS)[number];
export type GenericKpiLaunchFramework = (typeof GENERIC_KPI_LAUNCH_FRAMEWORKS)[number];

export type GenericKpiStatus = "draft" | "in_review" | "active" | "superseded" | "deprecated";

export interface BuildGenericKPIInput extends Partial<IndustryBaseContract> {
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
  kpiStatus?: GenericKpiStatus;
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
  minimumCellSizeDefaultOneForGeneric: true;
  belowMinimumCellSizeSuppressedOrRolledUp: true;
  loweringMinimumCellSizeRequiresExpertDetermination: true;
  isFrameworkAware: true;
  composesWithPhase41_5PresentationDifferences: true;
  isDefinitionNotComputation: true;
  citationReference: string;
  containsCopyrightedText: false;
  reviewerAttestation: ReviewerAttestation;
  requiresSpecialistReview: boolean;
  version: string;
  effectiveFromDate: string;
  deprecatedFromDate?: string;
  kpiStatus: GenericKpiStatus;
  activeRequiresAttestation: true;
  builderNeverAuthorsContent: true;
  appendOnlyHistory: true;
  priorVersionReferenceId: string;
  launchScope: "path_a";
  industryKpiComplete: boolean;
}

export interface BuildGenericKPIResult {
  industryKpi: SyntheticIndustryKPI | null;
  skipped: boolean;
  warnings: string[];
}

const DEFAULT_KPI_CLASSIFICATION_BY_TOPIC: Record<GenericKpiTopicIdentifier, IndustryKpiClassification> = {
  gross_margin_percent: "operational",
  operating_margin_percent: "operational",
  days_sales_outstanding: "revenueCycle",
  days_payable_outstanding: "operational",
  days_inventory_outstanding: "operational",
  cash_conversion_cycle: "operational",
  current_ratio: "operational",
  quick_ratio: "operational",
  working_capital: "operational",
  revenue_per_employee: "aggregateOnly",
};

export const PHASE_42J_GENERIC_KPI_BLUEPRINT: ReadonlyArray<BuildGenericKPIInput> =
  GENERIC_KPI_TOPIC_IDENTIFIERS.flatMap((kpiTopicIdentifier) =>
    GENERIC_KPI_LAUNCH_FRAMEWORKS.map((reportingFramework) => ({
      kpiTopicIdentifier,
      reportingFramework,
      industryClassification: "generic",
      industrySubClassification: "generic.default",
      kpiClassification: DEFAULT_KPI_CLASSIFICATION_BY_TOPIC[kpiTopicIdentifier],
      minimumCellSize: 1,
      requiresSpecialistReview: false,
      version: "0.0.0-draft",
      effectiveFromDate: "2026-01-01",
      kpiStatus: "draft" as GenericKpiStatus,
      kpiDefinitionAuthored: "",
      citationReference: "",
      priorVersionReferenceId: "",
    })),
  );

const OUTPUT_CLASSIFICATION: RecommendationOutputClassification = "recommendation_for_human_review";
const DEFAULT_PHI_DERIVATION_STATUS: PhiDerivationStatus = "containsPHI";
const GENERIC_INDUSTRY_CLASSIFICATION = "generic";
const GENERIC_INDUSTRY_SUB_CLASSIFICATION = "generic.default";
const DEFAULT_MINIMUM_CELL_SIZE = 1;

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

function isGenericKpiTopic(kpiTopicIdentifier: string): kpiTopicIdentifier is GenericKpiTopicIdentifier {
  return (GENERIC_KPI_TOPIC_IDENTIFIERS as readonly string[]).includes(kpiTopicIdentifier);
}

function isGenericKpiLaunchFramework(
  reportingFramework: IndustryBaseContract["reportingFramework"],
): reportingFramework is GenericKpiLaunchFramework {
  return (GENERIC_KPI_LAUNCH_FRAMEWORKS as readonly string[]).includes(reportingFramework);
}

function getReviewerAttestation(input: BuildGenericKPIInput): ReviewerAttestation {
  return (
    input.reviewerAttestation ?? {
      primaryReviewer: {
        identity: "",
        credentials: [],
        reviewDate: "",
        scope: "",
      },
      specialistReviewRequired: input.requiresSpecialistReview === true,
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

function getKpiStatus(input: BuildGenericKPIInput, reviewerAttestation: ReviewerAttestation): GenericKpiStatus {
  const requestedStatus = input.kpiStatus ?? "draft";

  if (requestedStatus === "active" && !hasPrimaryReviewerAttestation(reviewerAttestation)) {
    return "in_review";
  }

  if (requestedStatus === "superseded" || requestedStatus === "deprecated") {
    return requestedStatus;
  }

  if (requestedStatus === "active" && hasPrimaryReviewerAttestation(reviewerAttestation)) {
    return "active";
  }

  if (requestedStatus === "in_review") {
    return "in_review";
  }

  return "draft";
}

function getMinimumCellSize(input: BuildGenericKPIInput): number {
  return input.minimumCellSize ?? DEFAULT_MINIMUM_CELL_SIZE;
}

function getKpiClassification(
  input: BuildGenericKPIInput,
  kpiTopicIdentifier: string,
): IndustryKpiClassification {
  if (input.kpiClassification) {
    return input.kpiClassification;
  }

  if (isGenericKpiTopic(kpiTopicIdentifier)) {
    return DEFAULT_KPI_CLASSIFICATION_BY_TOPIC[kpiTopicIdentifier];
  }

  return "operational";
}

function getSharedBase(input: BuildGenericKPIInput): IndustryBaseContract {
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

function collectMissingRequiredIdentifiers(input: BuildGenericKPIInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.kpiTopicIdentifier)) {
    missing.push("kpiTopicIdentifier");
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

function buildGenericKPIKey(
  input: BuildGenericKPIInput,
  kpiStatus: GenericKpiStatus,
  reviewerAttestation: ReviewerAttestation,
  kpiClassification: IndustryKpiClassification,
  minimumCellSize: number,
): string {
  return stableSnapshotHash({
    kpiTopicIdentifier: input.kpiTopicIdentifier ?? "",
    industryClassification: GENERIC_INDUSTRY_CLASSIFICATION,
    industrySubClassification: GENERIC_INDUSTRY_SUB_CLASSIFICATION,
    reportingFramework: input.reportingFramework ?? "",
    kpiClassification,
    minimumCellSize,
    version: input.version ?? "",
    effectiveFromDate: input.effectiveFromDate ?? "",
    kpiStatus,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    citationReference: input.citationReference ?? "",
    primaryReviewerIdentity: reviewerAttestation.primaryReviewer.identity,
    primaryReviewerReviewDate: reviewerAttestation.primaryReviewer.reviewDate,
    launchScope: "path_a",
  });
}

function buildGenericKPIId(industryKpiKey: string): string {
  return `synthetic-industry-kpi:${stableSnapshotHash({
    industryKpiKey,
    artifactType: "SyntheticIndustryKPI",
  })}`;
}

function buildDerivationHash(industryKpiKey: string, kpiStatus: GenericKpiStatus): string {
  return stableSnapshotHash({
    industryKpiKey,
    activeRequiresAttestation: true,
    builderNeverAuthorsContent: true,
    isDefinitionNotComputation: true,
    isFrameworkAware: true,
    composesWithPhase41_5PresentationDifferences: true,
    minimumCellSizeDefaultOneForGeneric: true,
    containsCopyrightedText: false,
    appendOnlyHistory: true,
    launchScope: "path_a",
    kpiStatus,
  });
}

function getWarnings(
  input: BuildGenericKPIInput,
  kpiStatus: GenericKpiStatus,
  reviewerAttestation: ReviewerAttestation,
): string[] {
  const kpiTopicIdentifier = input.kpiTopicIdentifier ?? "";

  return [
    ...getInputArray(input.warnings),
    ...(input.kpiStatus === "active" && kpiStatus === "in_review"
      ? ["KPI marked active without primary reviewer identity and reviewDate; forced to in_review"]
      : []),
    ...(!hasValue(input.kpiDefinitionAuthored)
      ? ["kpiDefinitionAuthored is human-authored input; draft structure retained until definition content is supplied"]
      : []),
    ...(!hasValue(input.citationReference)
      ? ["citationReference holds a standard/source reference only, never reproduced text"]
      : []),
    ...(!isGenericKpiTopic(kpiTopicIdentifier)
      ? [`kpiTopicIdentifier ${kpiTopicIdentifier} is outside the generic KPI topic library`]
      : []),
    ...(input.reportingFramework && !isGenericKpiLaunchFramework(input.reportingFramework)
      ? [`reportingFramework ${input.reportingFramework} is outside the generic KPI launch framework set`]
      : []),
    ...(kpiStatus !== "active"
      ? ["KPI remains draft or in_review until primary reviewer attestation is complete"]
      : []),
    "metadata-only generic KPI definition library structure; builder never authors content and computes no metric values — computation against real data is downstream and on the real-data test register",
  ];
}

export function buildGenericKPI(input: BuildGenericKPIInput): BuildGenericKPIResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      industryKpi: null,
      skipped: true,
      warnings: [`missing required generic KPI identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const requiredKpiTopicIdentifier = input.kpiTopicIdentifier as string;
  const reviewerAttestation = getReviewerAttestation(input);
  const kpiStatus = getKpiStatus(input, reviewerAttestation);
  const kpiClassification = getKpiClassification(input, requiredKpiTopicIdentifier);
  const minimumCellSize = getMinimumCellSize(input);
  const industryKpiKey = buildGenericKPIKey(
    input,
    kpiStatus,
    reviewerAttestation,
    kpiClassification,
    minimumCellSize,
  );
  const base = getSharedBase(input);
  const industryKpi: SyntheticIndustryKPI = {
    ...base,
    industryKpiId: buildGenericKPIId(industryKpiKey),
    industryKpiKey,
    kpiTopicIdentifier: requiredKpiTopicIdentifier,
    kpiDefinitionAuthored: input.kpiDefinitionAuthored ?? "",
    kpiClassification,
    minimumCellSize,
    minimumCellSizeDefaultOneForGeneric: true,
    belowMinimumCellSizeSuppressedOrRolledUp: true,
    loweringMinimumCellSizeRequiresExpertDetermination: true,
    isFrameworkAware: true,
    composesWithPhase41_5PresentationDifferences: true,
    isDefinitionNotComputation: true,
    citationReference: input.citationReference ?? "",
    containsCopyrightedText: false,
    reviewerAttestation,
    requiresSpecialistReview: input.requiresSpecialistReview === true,
    version: input.version as string,
    effectiveFromDate: input.effectiveFromDate as string,
    deprecatedFromDate: input.deprecatedFromDate,
    kpiStatus,
    activeRequiresAttestation: true,
    builderNeverAuthorsContent: true,
    appendOnlyHistory: true,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    launchScope: "path_a",
    executable: false,
    derivationHash: buildDerivationHash(industryKpiKey, kpiStatus),
    warnings: getWarnings(input, kpiStatus, reviewerAttestation),
    industryKpiComplete:
      input.industryKpiComplete === true && kpiStatus === "active" && hasPrimaryReviewerAttestation(reviewerAttestation),
  };

  return {
    industryKpi,
    skipped: false,
    warnings: industryKpi.warnings,
  };
}
