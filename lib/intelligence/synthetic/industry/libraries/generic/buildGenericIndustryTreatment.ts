import { stableSnapshotHash } from "../../../../core/hash";
import type {
  IndustryBaseContract,
  IndustryTreatmentStatus,
  PhiDerivationStatus,
  RecommendationOutputClassification,
  ReviewerAttestation,
} from "../../contracts";

export const GENERIC_BASELINE_TOPIC_IDENTIFIERS = [
  "professional_services_revenue_recognition",
  "generic_smb_inventory",
  "light_manufacturing_cost_accounting",
  "small_distributor_inventory_and_freight",
  "holding_company_treatment",
  "generic_smb_payroll_and_benefits_accruals",
  "generic_smb_fixed_asset_categories",
  "generic_smb_prepaid_and_accrual_conventions",
  "generic_smb_deferred_revenue_basic",
  "generic_smb_lease_classification",
] as const;

export const GENERIC_LAUNCH_FRAMEWORKS = [
  "us_gaap",
  "ifrs_for_smes",
  "ifrs_iasb",
  "ifrs_eu",
] as const;

export type GenericBaselineTopicIdentifier = (typeof GENERIC_BASELINE_TOPIC_IDENTIFIERS)[number];
export type GenericLaunchFramework = (typeof GENERIC_LAUNCH_FRAMEWORKS)[number];

export interface BuildGenericIndustryTreatmentInput extends Partial<IndustryBaseContract> {
  topicIdentifier?: string;
  treatmentSummaryAuthored?: string;
  citationReference?: string;
  reviewerAttestation?: ReviewerAttestation;
  requiresSpecialistReview?: boolean;
  version?: string;
  effectiveFromDate?: string;
  deprecatedFromDate?: string;
  treatmentStatus?: IndustryTreatmentStatus;
  priorVersionReferenceId?: string;
  industryTreatmentComplete?: boolean;
}

export interface SyntheticIndustryTreatment extends IndustryBaseContract {
  industryTreatmentId: string;
  industryTreatmentKey: string;
  topicIdentifier: string;
  treatmentSummaryAuthored: string;
  citationReference: string;
  containsCopyrightedText: false;
  citationIsReferenceOnlyNeverReproducedText: true;
  reviewerAttestation: ReviewerAttestation;
  requiresSpecialistReview: boolean;
  moduleSpecialistReviewDefaultIsFalseForGeneric: true;
  isIndustryOverlayNotFrameworkBase: true;
  composesWithFrameworkTreatment: true;
  version: string;
  effectiveFromDate: string;
  deprecatedFromDate?: string;
  treatmentStatus: IndustryTreatmentStatus;
  activeRequiresAttestation: true;
  builderNeverAuthorsContent: true;
  appendOnlyHistory: true;
  priorVersionReferenceId: string;
  launchScope: "path_a";
  industryTreatmentComplete: boolean;
}

export interface BuildGenericIndustryTreatmentResult {
  industryTreatment: SyntheticIndustryTreatment | null;
  skipped: boolean;
  warnings: string[];
}

export const PHASE_42I_GENERIC_TREATMENT_BLUEPRINT: ReadonlyArray<BuildGenericIndustryTreatmentInput> =
  GENERIC_BASELINE_TOPIC_IDENTIFIERS.flatMap((topicIdentifier) =>
    GENERIC_LAUNCH_FRAMEWORKS.map((reportingFramework) => ({
      topicIdentifier,
      reportingFramework,
      industryClassification: "generic",
      industrySubClassification: "generic.default",
      requiresSpecialistReview: false,
      version: "0.0.0-draft",
      effectiveFromDate: "2026-01-01",
      treatmentStatus: "draft" as IndustryTreatmentStatus,
      citationReference: "",
      treatmentSummaryAuthored: "",
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

function getPhiDerivationStatus(
  inputContainsPHI: boolean | undefined,
  inputPhiDerivationStatus: PhiDerivationStatus | undefined,
): PhiDerivationStatus {
  if (inputPhiDerivationStatus) {
    return inputPhiDerivationStatus;
  }

  return inputContainsPHI === false ? "containsNoPHI" : DEFAULT_PHI_DERIVATION_STATUS;
}

function isGenericBaselineTopic(topicIdentifier: string): topicIdentifier is GenericBaselineTopicIdentifier {
  return (GENERIC_BASELINE_TOPIC_IDENTIFIERS as readonly string[]).includes(topicIdentifier);
}

function isGenericLaunchFramework(
  reportingFramework: IndustryBaseContract["reportingFramework"],
): reportingFramework is GenericLaunchFramework {
  return (GENERIC_LAUNCH_FRAMEWORKS as readonly string[]).includes(reportingFramework);
}

function getReviewerAttestation(input: BuildGenericIndustryTreatmentInput): ReviewerAttestation {
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

function getTreatmentStatus(
  input: BuildGenericIndustryTreatmentInput,
  reviewerAttestation: ReviewerAttestation,
): IndustryTreatmentStatus {
  const requestedStatus = input.treatmentStatus ?? "draft";

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

function getSharedBase(input: BuildGenericIndustryTreatmentInput): IndustryBaseContract {
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
    industryClassification: GENERIC_INDUSTRY_CLASSIFICATION,
    industrySubClassification: GENERIC_INDUSTRY_SUB_CLASSIFICATION,
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

function collectMissingRequiredIdentifiers(input: BuildGenericIndustryTreatmentInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.topicIdentifier)) {
    missing.push("topicIdentifier");
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

function buildGenericIndustryTreatmentKey(
  input: BuildGenericIndustryTreatmentInput,
  treatmentStatus: IndustryTreatmentStatus,
  reviewerAttestation: ReviewerAttestation,
): string {
  return stableSnapshotHash({
    topicIdentifier: input.topicIdentifier ?? "",
    industryClassification: GENERIC_INDUSTRY_CLASSIFICATION,
    industrySubClassification: GENERIC_INDUSTRY_SUB_CLASSIFICATION,
    reportingFramework: input.reportingFramework ?? "",
    version: input.version ?? "",
    effectiveFromDate: input.effectiveFromDate ?? "",
    treatmentStatus,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    citationReference: input.citationReference ?? "",
    primaryReviewerIdentity: reviewerAttestation.primaryReviewer.identity,
    primaryReviewerReviewDate: reviewerAttestation.primaryReviewer.reviewDate,
    requiresSpecialistReview: input.requiresSpecialistReview === true,
    launchScope: "path_a",
  });
}

function buildGenericIndustryTreatmentId(input: BuildGenericIndustryTreatmentInput, treatmentKey: string): string {
  return `synthetic-industry-treatment:${stableSnapshotHash({
    industryTreatmentKey: treatmentKey,
    artifactType: "SyntheticIndustryTreatment",
  })}`;
}

function buildDerivationHash(
  input: BuildGenericIndustryTreatmentInput,
  treatmentKey: string,
  treatmentStatus: IndustryTreatmentStatus,
): string {
  return stableSnapshotHash({
    industryTreatmentKey: treatmentKey,
    activeRequiresAttestation: true,
    builderNeverAuthorsContent: true,
    citationIsReferenceOnlyNeverReproducedText: true,
    containsCopyrightedText: false,
    isIndustryOverlayNotFrameworkBase: true,
    composesWithFrameworkTreatment: true,
    moduleSpecialistReviewDefaultIsFalseForGeneric: true,
    appendOnlyHistory: true,
    launchScope: "path_a",
    treatmentStatus,
  });
}

function getWarnings(
  input: BuildGenericIndustryTreatmentInput,
  treatmentStatus: IndustryTreatmentStatus,
  reviewerAttestation: ReviewerAttestation,
): string[] {
  const topicIdentifier = input.topicIdentifier ?? "";

  return [
    ...getInputArray(input.warnings),
    ...(input.treatmentStatus === "active" && treatmentStatus === "in_review"
      ? ["treatment marked active without primary reviewer identity and reviewDate; forced to in_review"]
      : []),
    ...(!hasValue(input.treatmentSummaryAuthored)
      ? ["treatmentSummaryAuthored is human-authored input; draft structure retained until content is supplied"]
      : []),
    ...(!hasValue(input.citationReference)
      ? ["citationReference holds a standard/source reference only, never reproduced text"]
      : []),
    ...(!isGenericBaselineTopic(topicIdentifier)
      ? [`topicIdentifier ${topicIdentifier} is outside the generic baseline topic library`]
      : []),
    ...(input.reportingFramework && !isGenericLaunchFramework(input.reportingFramework)
      ? [`reportingFramework ${input.reportingFramework} is outside the generic launch framework set`]
      : []),
    ...(input.requiresSpecialistReview === true &&
    !reviewerAttestation.specialistReviewer &&
    !reviewerAttestation.specialistReviewOptOutJustification
      ? ["requiresSpecialistReview opt-in present without specialist reviewer or attested opt-out"]
      : []),
    ...(treatmentStatus !== "active"
      ? ["treatment remains draft or in_review until primary reviewer attestation is complete"]
      : []),
    "metadata-only generic industry treatment library structure; builder never authors content and treatment accuracy against real generic-SMB transactions is on the real-data test register",
  ];
}

export function buildGenericIndustryTreatment(
  input: BuildGenericIndustryTreatmentInput,
): BuildGenericIndustryTreatmentResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      industryTreatment: null,
      skipped: true,
      warnings: [`missing required generic industry treatment identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const requiredTopicIdentifier = input.topicIdentifier as string;
  const requiredReportingFramework = input.reportingFramework as IndustryBaseContract["reportingFramework"];
  const requiredVersion = input.version as string;
  const requiredEffectiveFromDate = input.effectiveFromDate as string;
  const reviewerAttestation = getReviewerAttestation(input);
  const treatmentStatus = getTreatmentStatus(input, reviewerAttestation);
  const industryTreatmentKey = buildGenericIndustryTreatmentKey(input, treatmentStatus, reviewerAttestation);
  const base = getSharedBase(input);
  const industryTreatment: SyntheticIndustryTreatment = {
    ...base,
    industryTreatmentId: buildGenericIndustryTreatmentId(input, industryTreatmentKey),
    industryTreatmentKey,
    topicIdentifier: requiredTopicIdentifier,
    treatmentSummaryAuthored: input.treatmentSummaryAuthored ?? "",
    citationReference: input.citationReference ?? "",
    containsCopyrightedText: false,
    citationIsReferenceOnlyNeverReproducedText: true,
    reviewerAttestation,
    requiresSpecialistReview: input.requiresSpecialistReview === true,
    moduleSpecialistReviewDefaultIsFalseForGeneric: true,
    isIndustryOverlayNotFrameworkBase: true,
    composesWithFrameworkTreatment: true,
    version: requiredVersion,
    effectiveFromDate: requiredEffectiveFromDate,
    deprecatedFromDate: input.deprecatedFromDate,
    treatmentStatus,
    activeRequiresAttestation: true,
    builderNeverAuthorsContent: true,
    appendOnlyHistory: true,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    launchScope: "path_a",
    executable: false,
    derivationHash: buildDerivationHash(input, industryTreatmentKey, treatmentStatus),
    warnings: getWarnings(input, treatmentStatus, reviewerAttestation),
    industryTreatmentComplete:
      input.industryTreatmentComplete === true &&
      treatmentStatus === "active" &&
      hasPrimaryReviewerAttestation(reviewerAttestation),
  };

  return {
    industryTreatment,
    skipped: false,
    warnings: industryTreatment.warnings,
  };
}
