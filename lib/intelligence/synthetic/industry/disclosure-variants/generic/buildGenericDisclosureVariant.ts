import { stableSnapshotHash } from "../../../../core/hash";
import type {
  IndustryBaseContract,
  PhiDerivationStatus,
  RecommendationOutputClassification,
  ReviewerAttestation,
} from "../../contracts";

export const GENERIC_DISCLOSURE_TOPIC_IDENTIFIERS = [
  "revenue_disaggregation_smb_professional_services_and_distribution",
  "concentration_risk_customer_supplier_geographic",
  "going_concern_considerations_smb",
  "related_party_disclosures_closely_held_smb",
] as const;

export const GENERIC_DISCLOSURE_LAUNCH_FRAMEWORKS = [
  "us_gaap",
  "ifrs_for_smes",
  "ifrs_iasb",
  "ifrs_eu",
] as const;

export type GenericDisclosureTopicIdentifier = (typeof GENERIC_DISCLOSURE_TOPIC_IDENTIFIERS)[number];
export type GenericDisclosureLaunchFramework = (typeof GENERIC_DISCLOSURE_LAUNCH_FRAMEWORKS)[number];

export type GenericDisclosureStatus = "draft" | "in_review" | "active" | "superseded" | "deprecated";

export interface BuildGenericDisclosureVariantInput extends Partial<IndustryBaseContract> {
  topicIdentifier?: string;
  linkedTreatmentReferenceId?: string;
  linkedFrameworkDisclosureRequirementReferenceId?: string;
  disclosureSummaryAuthored?: string;
  citationReference?: string;
  reviewerAttestation?: ReviewerAttestation;
  requiresSpecialistReview?: boolean;
  version?: string;
  effectiveFromDate?: string;
  deprecatedFromDate?: string;
  disclosureStatus?: GenericDisclosureStatus;
  priorVersionReferenceId?: string;
  industryDisclosureComplete?: boolean;
}

export interface SyntheticIndustryDisclosure extends IndustryBaseContract {
  industryDisclosureId: string;
  industryDisclosureKey: string;
  topicIdentifier: string;
  linkedTreatmentReferenceId: string;
  linkedFrameworkDisclosureRequirementReferenceId: string;
  disclosureSummaryAuthored: string;
  citationReference: string;
  containsCopyrightedText: false;
  citationIsReferenceOnlyNeverReproducedText: true;
  composesWithPhase41_5DisclosureRequirements: true;
  isIndustryVariantNotFrameworkBase: true;
  frameworkTaggedNeverBleedsAcrossFrameworks: true;
  industryTaggedNeverBleedsAcrossIndustries: true;
  consumedByDownstreamReportingPhase: true;
  downstreamChecklistGenerationIsPhase45: true;
  reviewerAttestation: ReviewerAttestation;
  requiresSpecialistReview: boolean;
  version: string;
  effectiveFromDate: string;
  deprecatedFromDate?: string;
  disclosureStatus: GenericDisclosureStatus;
  activeRequiresAttestation: true;
  builderNeverAuthorsContent: true;
  appendOnlyHistory: true;
  priorVersionReferenceId: string;
  launchScope: "path_a";
  industryDisclosureComplete: boolean;
}

export interface BuildGenericDisclosureVariantResult {
  industryDisclosure: SyntheticIndustryDisclosure | null;
  skipped: boolean;
  warnings: string[];
}

export const PHASE_42K_GENERIC_DISCLOSURE_BLUEPRINT: ReadonlyArray<BuildGenericDisclosureVariantInput> =
  GENERIC_DISCLOSURE_TOPIC_IDENTIFIERS.flatMap((topicIdentifier) =>
    GENERIC_DISCLOSURE_LAUNCH_FRAMEWORKS.map((reportingFramework) => ({
      topicIdentifier,
      reportingFramework,
      industryClassification: "generic",
      industrySubClassification: "generic.default",
      requiresSpecialistReview: false,
      version: "0.0.0-draft",
      effectiveFromDate: "2026-01-01",
      disclosureStatus: "draft" as GenericDisclosureStatus,
      disclosureSummaryAuthored: "",
      citationReference: "",
      linkedTreatmentReferenceId: "",
      linkedFrameworkDisclosureRequirementReferenceId: "",
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

function isGenericDisclosureTopic(topicIdentifier: string): topicIdentifier is GenericDisclosureTopicIdentifier {
  return (GENERIC_DISCLOSURE_TOPIC_IDENTIFIERS as readonly string[]).includes(topicIdentifier);
}

function isGenericDisclosureLaunchFramework(
  reportingFramework: IndustryBaseContract["reportingFramework"],
): reportingFramework is GenericDisclosureLaunchFramework {
  return (GENERIC_DISCLOSURE_LAUNCH_FRAMEWORKS as readonly string[]).includes(reportingFramework);
}

function getReviewerAttestation(input: BuildGenericDisclosureVariantInput): ReviewerAttestation {
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

function getDisclosureStatus(
  input: BuildGenericDisclosureVariantInput,
  reviewerAttestation: ReviewerAttestation,
): GenericDisclosureStatus {
  const requestedStatus = input.disclosureStatus ?? "draft";

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

function getSharedBase(input: BuildGenericDisclosureVariantInput): IndustryBaseContract {
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

function collectMissingRequiredIdentifiers(input: BuildGenericDisclosureVariantInput): string[] {
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

function buildGenericDisclosureVariantKey(
  input: BuildGenericDisclosureVariantInput,
  disclosureStatus: GenericDisclosureStatus,
  reviewerAttestation: ReviewerAttestation,
): string {
  return stableSnapshotHash({
    topicIdentifier: input.topicIdentifier ?? "",
    industryClassification: GENERIC_INDUSTRY_CLASSIFICATION,
    industrySubClassification: GENERIC_INDUSTRY_SUB_CLASSIFICATION,
    reportingFramework: input.reportingFramework ?? "",
    linkedTreatmentReferenceId: input.linkedTreatmentReferenceId ?? "",
    linkedFrameworkDisclosureRequirementReferenceId:
      input.linkedFrameworkDisclosureRequirementReferenceId ?? "",
    version: input.version ?? "",
    effectiveFromDate: input.effectiveFromDate ?? "",
    disclosureStatus,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    citationReference: input.citationReference ?? "",
    primaryReviewerIdentity: reviewerAttestation.primaryReviewer.identity,
    primaryReviewerReviewDate: reviewerAttestation.primaryReviewer.reviewDate,
    launchScope: "path_a",
  });
}

function buildGenericDisclosureVariantId(industryDisclosureKey: string): string {
  return `synthetic-industry-disclosure:${stableSnapshotHash({
    industryDisclosureKey,
    artifactType: "SyntheticIndustryDisclosure",
  })}`;
}

function buildDerivationHash(industryDisclosureKey: string, disclosureStatus: GenericDisclosureStatus): string {
  return stableSnapshotHash({
    industryDisclosureKey,
    activeRequiresAttestation: true,
    builderNeverAuthorsContent: true,
    citationIsReferenceOnlyNeverReproducedText: true,
    composesWithPhase41_5DisclosureRequirements: true,
    isIndustryVariantNotFrameworkBase: true,
    frameworkTaggedNeverBleedsAcrossFrameworks: true,
    industryTaggedNeverBleedsAcrossIndustries: true,
    consumedByDownstreamReportingPhase: true,
    downstreamChecklistGenerationIsPhase45: true,
    containsCopyrightedText: false,
    appendOnlyHistory: true,
    launchScope: "path_a",
    disclosureStatus,
  });
}

function getWarnings(
  input: BuildGenericDisclosureVariantInput,
  disclosureStatus: GenericDisclosureStatus,
): string[] {
  const topicIdentifier = input.topicIdentifier ?? "";

  return [
    ...getInputArray(input.warnings),
    ...(input.disclosureStatus === "active" && disclosureStatus === "in_review"
      ? ["disclosure variant marked active without primary reviewer identity and reviewDate; forced to in_review"]
      : []),
    ...(!hasValue(input.disclosureSummaryAuthored)
      ? ["disclosureSummaryAuthored is human-authored input; draft structure retained until disclosure content is supplied"]
      : []),
    ...(!hasValue(input.citationReference)
      ? ["citationReference holds a standard/source reference only, never reproduced text"]
      : []),
    ...(!hasValue(input.linkedFrameworkDisclosureRequirementReferenceId)
      ? ["linkedFrameworkDisclosureRequirementReferenceId should reference the Phase 41.5U framework disclosure requirement this variant composes with"]
      : []),
    ...(!isGenericDisclosureTopic(topicIdentifier)
      ? [`topicIdentifier ${topicIdentifier} is outside the generic disclosure variant library`]
      : []),
    ...(input.reportingFramework && !isGenericDisclosureLaunchFramework(input.reportingFramework)
      ? [`reportingFramework ${input.reportingFramework} is outside the generic disclosure launch framework set`]
      : []),
    ...(disclosureStatus !== "active"
      ? ["disclosure variant remains draft or in_review until primary reviewer attestation is complete"]
      : []),
    "metadata-only generic disclosure variant library structure; builder never authors content and generates no checklist — checklist generation is downstream Phase 45 and disclosure completeness against real reporting is on the real-data test register",
  ];
}

export function buildGenericDisclosureVariant(
  input: BuildGenericDisclosureVariantInput,
): BuildGenericDisclosureVariantResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      industryDisclosure: null,
      skipped: true,
      warnings: [`missing required generic disclosure variant identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const requiredTopicIdentifier = input.topicIdentifier as string;
  const reviewerAttestation = getReviewerAttestation(input);
  const disclosureStatus = getDisclosureStatus(input, reviewerAttestation);
  const industryDisclosureKey = buildGenericDisclosureVariantKey(input, disclosureStatus, reviewerAttestation);
  const base = getSharedBase(input);
  const industryDisclosure: SyntheticIndustryDisclosure = {
    ...base,
    industryDisclosureId: buildGenericDisclosureVariantId(industryDisclosureKey),
    industryDisclosureKey,
    topicIdentifier: requiredTopicIdentifier,
    linkedTreatmentReferenceId: input.linkedTreatmentReferenceId ?? "",
    linkedFrameworkDisclosureRequirementReferenceId:
      input.linkedFrameworkDisclosureRequirementReferenceId ?? "",
    disclosureSummaryAuthored: input.disclosureSummaryAuthored ?? "",
    citationReference: input.citationReference ?? "",
    containsCopyrightedText: false,
    citationIsReferenceOnlyNeverReproducedText: true,
    composesWithPhase41_5DisclosureRequirements: true,
    isIndustryVariantNotFrameworkBase: true,
    frameworkTaggedNeverBleedsAcrossFrameworks: true,
    industryTaggedNeverBleedsAcrossIndustries: true,
    consumedByDownstreamReportingPhase: true,
    downstreamChecklistGenerationIsPhase45: true,
    reviewerAttestation,
    requiresSpecialistReview: input.requiresSpecialistReview === true,
    version: input.version as string,
    effectiveFromDate: input.effectiveFromDate as string,
    deprecatedFromDate: input.deprecatedFromDate,
    disclosureStatus,
    activeRequiresAttestation: true,
    builderNeverAuthorsContent: true,
    appendOnlyHistory: true,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    launchScope: "path_a",
    executable: false,
    derivationHash: buildDerivationHash(industryDisclosureKey, disclosureStatus),
    warnings: getWarnings(input, disclosureStatus),
    industryDisclosureComplete:
      input.industryDisclosureComplete === true &&
      disclosureStatus === "active" &&
      hasPrimaryReviewerAttestation(reviewerAttestation),
  };

  return {
    industryDisclosure,
    skipped: false,
    warnings: industryDisclosure.warnings,
  };
}
