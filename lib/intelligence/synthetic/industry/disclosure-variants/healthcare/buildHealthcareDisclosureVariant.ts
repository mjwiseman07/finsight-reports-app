import { stableSnapshotHash } from "../../../../core/hash";
import type {
  IndustryBaseContract,
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

export const HEALTHCARE_DISCLOSURE_TOPIC_IDENTIFIERS = [
  "concentration_of_credit_risk_by_payor_type",
  "self_insured_medical_malpractice_disclosures",
  "community_benefit_for_for_profit_healthcare",
  "patient_service_revenue_disaggregation",
  "drug_pricing_program_340b_disclosure_considerations",
] as const;

export const HEALTHCARE_DISCLOSURE_DROPPED_TOPIC_IDENTIFIERS = ["functional_expense_allocation"] as const;

export const HEALTHCARE_DISCLOSURE_LAUNCH_FRAMEWORKS = ["us_gaap"] as const;

export const COMMUNITY_BENEFIT_FOR_PROFIT_TOPIC = "community_benefit_for_for_profit_healthcare";

export type HealthcareSubClassification = (typeof HEALTHCARE_SUB_CLASSIFICATIONS)[number];
export type HealthcareDisclosureTopicIdentifier = (typeof HEALTHCARE_DISCLOSURE_TOPIC_IDENTIFIERS)[number];
export type HealthcareDisclosureLaunchFramework = (typeof HEALTHCARE_DISCLOSURE_LAUNCH_FRAMEWORKS)[number];
export type HealthcareDisclosureStatus = IndustryTreatmentStatus;

export interface HealthcareDisclosureNfpBoundaryTest {
  requiresEntityToBe501c3OrApplyAsc958: boolean;
  ifRequires501c3OrAsc958ThenOutOfScope: true;
  ifConceptExistsForForProfitHealthcareThenInScope: true;
  nfpFundAccountingIsOutOfScope: true;
}

export interface BuildHealthcareDisclosureVariantInput extends Partial<IndustryBaseContract> {
  topicIdentifier?: string;
  linkedTreatmentReferenceId?: string;
  linkedFrameworkDisclosureRequirementReferenceId?: string;
  disclosureSummaryAuthored?: string;
  citationReference?: string;
  reviewerAttestation?: ReviewerAttestation;
  requiresSpecialistReview?: boolean;
  nfpBoundaryTest?: Pick<HealthcareDisclosureNfpBoundaryTest, "requiresEntityToBe501c3OrApplyAsc958">;
  version?: string;
  effectiveFromDate?: string;
  deprecatedFromDate?: string;
  disclosureStatus?: HealthcareDisclosureStatus;
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
  forProfitHealthcareScopeOnly: boolean;
  nfpBoundaryTest: HealthcareDisclosureNfpBoundaryTest;
  reviewerAttestation: ReviewerAttestation;
  requiresSpecialistReview: boolean;
  moduleSpecialistReviewDefaultIsTrueForHealthcare: true;
  specialistAttestationGovernanceMetadataNotCustomerFacing: true;
  version: string;
  effectiveFromDate: string;
  deprecatedFromDate?: string;
  disclosureStatus: HealthcareDisclosureStatus;
  activeRequiresAttestation: true;
  activeRequiresSpecialistAttestationWhenFlagged: true;
  builderNeverAuthorsContent: true;
  appendOnlyHistory: true;
  priorVersionReferenceId: string;
  launchScope: "path_b";
  industryDisclosureComplete: boolean;
}

export interface BuildHealthcareDisclosureVariantResult {
  industryDisclosure: SyntheticIndustryDisclosure | null;
  skipped: boolean;
  warnings: string[];
}

export const PHASE_42O_HEALTHCARE_DISCLOSURE_BLUEPRINT: ReadonlyArray<BuildHealthcareDisclosureVariantInput> =
  HEALTHCARE_DISCLOSURE_TOPIC_IDENTIFIERS.flatMap((topicIdentifier) =>
    HEALTHCARE_SUB_CLASSIFICATIONS.map((industrySubClassification) => ({
      topicIdentifier,
      reportingFramework: "us_gaap" as HealthcareDisclosureLaunchFramework,
      industryClassification: "healthcare",
      industrySubClassification,
      requiresSpecialistReview: true,
      nfpBoundaryTest: {
        requiresEntityToBe501c3OrApplyAsc958: false,
      },
      version: "0.0.0-draft",
      effectiveFromDate: "2026-01-01",
      disclosureStatus: "draft" as HealthcareDisclosureStatus,
      disclosureSummaryAuthored: "",
      citationReference: "",
      linkedTreatmentReferenceId: "",
      linkedFrameworkDisclosureRequirementReferenceId: "",
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

function isHealthcareDisclosureTopic(
  topicIdentifier: string,
): topicIdentifier is HealthcareDisclosureTopicIdentifier {
  return (HEALTHCARE_DISCLOSURE_TOPIC_IDENTIFIERS as readonly string[]).includes(topicIdentifier);
}

function isDroppedHealthcareDisclosureTopic(topicIdentifier: string): boolean {
  return (HEALTHCARE_DISCLOSURE_DROPPED_TOPIC_IDENTIFIERS as readonly string[]).includes(topicIdentifier);
}

function isHealthcareSubClassification(
  industrySubClassification: string,
): industrySubClassification is HealthcareSubClassification {
  return (HEALTHCARE_SUB_CLASSIFICATIONS as readonly string[]).includes(industrySubClassification);
}

function isHealthcareDisclosureLaunchFramework(
  reportingFramework: IndustryBaseContract["reportingFramework"],
): reportingFramework is HealthcareDisclosureLaunchFramework {
  return (HEALTHCARE_DISCLOSURE_LAUNCH_FRAMEWORKS as readonly string[]).includes(reportingFramework);
}

function forProfitHealthcareScopeOnly(topicIdentifier: string): boolean {
  return topicIdentifier === COMMUNITY_BENEFIT_FOR_PROFIT_TOPIC;
}

function getRequiresSpecialistReview(input: BuildHealthcareDisclosureVariantInput): boolean {
  return input.requiresSpecialistReview ?? true;
}

function getNfpBoundaryTest(input: BuildHealthcareDisclosureVariantInput): HealthcareDisclosureNfpBoundaryTest {
  return {
    requiresEntityToBe501c3OrApplyAsc958:
      input.nfpBoundaryTest?.requiresEntityToBe501c3OrApplyAsc958 === true,
    ifRequires501c3OrAsc958ThenOutOfScope: true,
    ifConceptExistsForForProfitHealthcareThenInScope: true,
    nfpFundAccountingIsOutOfScope: true,
  };
}

function getReviewerAttestation(
  input: BuildHealthcareDisclosureVariantInput,
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

function getDisclosureStatus(
  input: BuildHealthcareDisclosureVariantInput,
  reviewerAttestation: ReviewerAttestation,
  requiresSpecialistReview: boolean,
): HealthcareDisclosureStatus {
  const requestedStatus = input.disclosureStatus ?? "draft";

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

function getSharedBase(input: BuildHealthcareDisclosureVariantInput): IndustryBaseContract {
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

function collectMissingRequiredIdentifiers(input: BuildHealthcareDisclosureVariantInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.topicIdentifier)) {
    missing.push("topicIdentifier");
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

function collectValidationFailures(
  input: BuildHealthcareDisclosureVariantInput,
  nfpBoundaryTest: HealthcareDisclosureNfpBoundaryTest,
): string[] {
  const failures: string[] = [];
  const topicIdentifier = input.topicIdentifier ?? "";

  if (input.reportingFramework && !isHealthcareDisclosureLaunchFramework(input.reportingFramework)) {
    failures.push("reportingFramework must be us_gaap for healthcare disclosure launch scope");
  }

  if (isDroppedHealthcareDisclosureTopic(topicIdentifier)) {
    failures.push(`topicIdentifier ${topicIdentifier} is dropped from healthcare disclosure launch scope`);
  }

  if (hasValue(topicIdentifier) && !isHealthcareDisclosureTopic(topicIdentifier)) {
    failures.push(`topicIdentifier ${topicIdentifier} is outside the healthcare disclosure variant library`);
  }

  if (
    topicIdentifier === COMMUNITY_BENEFIT_FOR_PROFIT_TOPIC &&
    nfpBoundaryTest.requiresEntityToBe501c3OrApplyAsc958
  ) {
    failures.push(
      "community-benefit variant requires 501(c)(3) or ASC 958; NFP fund accounting is out of scope for for-profit healthcare",
    );
  }

  return failures;
}

function buildHealthcareDisclosureVariantKey(
  input: BuildHealthcareDisclosureVariantInput,
  disclosureStatus: HealthcareDisclosureStatus,
  reviewerAttestation: ReviewerAttestation,
  requiresSpecialistReview: boolean,
  forProfitScopeOnly: boolean,
  nfpBoundaryTest: HealthcareDisclosureNfpBoundaryTest,
): string {
  return stableSnapshotHash({
    topicIdentifier: input.topicIdentifier ?? "",
    industryClassification: HEALTHCARE_INDUSTRY_CLASSIFICATION,
    industrySubClassification: input.industrySubClassification ?? "",
    reportingFramework: input.reportingFramework ?? "",
    linkedTreatmentReferenceId: input.linkedTreatmentReferenceId ?? "",
    linkedFrameworkDisclosureRequirementReferenceId:
      input.linkedFrameworkDisclosureRequirementReferenceId ?? "",
    forProfitHealthcareScopeOnly: forProfitScopeOnly,
    nfpBoundaryTest,
    version: input.version ?? "",
    effectiveFromDate: input.effectiveFromDate ?? "",
    disclosureStatus,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    citationReference: input.citationReference ?? "",
    primaryReviewerIdentity: reviewerAttestation.primaryReviewer.identity,
    primaryReviewerReviewDate: reviewerAttestation.primaryReviewer.reviewDate,
    requiresSpecialistReview,
    launchScope: "path_b",
  });
}

function buildHealthcareDisclosureVariantId(industryDisclosureKey: string): string {
  return `synthetic-industry-disclosure:${stableSnapshotHash({
    industryDisclosureKey,
    artifactType: "SyntheticIndustryDisclosure",
  })}`;
}

function buildDerivationHash(
  industryDisclosureKey: string,
  disclosureStatus: HealthcareDisclosureStatus,
): string {
  return stableSnapshotHash({
    industryDisclosureKey,
    activeRequiresAttestation: true,
    activeRequiresSpecialistAttestationWhenFlagged: true,
    builderNeverAuthorsContent: true,
    citationIsReferenceOnlyNeverReproducedText: true,
    composesWithPhase41_5DisclosureRequirements: true,
    isIndustryVariantNotFrameworkBase: true,
    frameworkTaggedNeverBleedsAcrossFrameworks: true,
    industryTaggedNeverBleedsAcrossIndustries: true,
    consumedByDownstreamReportingPhase: true,
    downstreamChecklistGenerationIsPhase45: true,
    moduleSpecialistReviewDefaultIsTrueForHealthcare: true,
    specialistAttestationGovernanceMetadataNotCustomerFacing: true,
    ifRequires501c3OrAsc958ThenOutOfScope: true,
    ifConceptExistsForForProfitHealthcareThenInScope: true,
    nfpFundAccountingIsOutOfScope: true,
    containsCopyrightedText: false,
    appendOnlyHistory: true,
    launchScope: "path_b",
    disclosureStatus,
  });
}

function getWarnings(
  input: BuildHealthcareDisclosureVariantInput,
  disclosureStatus: HealthcareDisclosureStatus,
  reviewerAttestation: ReviewerAttestation,
  requiresSpecialistReview: boolean,
  topicIdentifier: string,
  forProfitScopeOnly: boolean,
  validationFailures: string[],
): string[] {
  return [
    ...getInputArray(input.warnings),
    ...validationFailures.map((failure) => `healthcare disclosure variant failed closed: ${failure}`),
    ...(input.disclosureStatus === "active" && disclosureStatus === "in_review"
      ? [
          requiresSpecialistReview
            ? "healthcare disclosure variant marked active without primary reviewer and specialist attestation; forced to in_review"
            : "disclosure variant marked active without primary reviewer identity and reviewDate; forced to in_review",
        ]
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
    ...(!isHealthcareDisclosureTopic(topicIdentifier)
      ? [`topicIdentifier ${topicIdentifier} is outside the healthcare disclosure variant library`]
      : []),
    ...(input.reportingFramework && !isHealthcareDisclosureLaunchFramework(input.reportingFramework)
      ? [`reportingFramework ${input.reportingFramework} is outside the healthcare disclosure launch framework set`]
      : []),
    ...(requiresSpecialistReview &&
    !hasSpecialistReviewerAttestation(reviewerAttestation) &&
    disclosureStatus !== "active"
      ? ["requiresSpecialistReview healthcare disclosure variant remains non-active until specialistReviewer attestation or complete specialistReviewOptOutJustification"]
      : []),
    ...(forProfitScopeOnly
      ? [
          "community_benefit_for_for_profit_healthcare is for-profit healthcare scope only; NFP fund accounting (ASC 958) fails the boundary test",
        ]
      : []),
    ...(forProfitScopeOnly
      ? ["reviewer attests the NFP boundary line when authoring; functional expense allocation is dropped from launch"]
      : []),
    "functional_expense_allocation is dropped from launch and revisited when NFP industry is populated",
    "specialist attestation identity and credentials are internal governance provenance and are not customer-facing",
    ...(disclosureStatus !== "active"
      ? ["disclosure variant remains draft or in_review until attestation requirements are complete"]
      : []),
    "metadata-only healthcare disclosure variant library structure; builder never authors content and generates no checklist — checklist generation is downstream Phase 45 and disclosure completeness against real reporting is on the real-data test register",
  ];
}

function isIndustryDisclosureComplete(
  input: BuildHealthcareDisclosureVariantInput,
  disclosureStatus: HealthcareDisclosureStatus,
  reviewerAttestation: ReviewerAttestation,
  requiresSpecialistReview: boolean,
): boolean {
  if (input.industryDisclosureComplete !== true || disclosureStatus !== "active") {
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

export function buildHealthcareDisclosureVariant(
  input: BuildHealthcareDisclosureVariantInput,
): BuildHealthcareDisclosureVariantResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      industryDisclosure: null,
      skipped: true,
      warnings: [
        `missing required healthcare disclosure variant identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const nfpBoundaryTest = getNfpBoundaryTest(input);
  const validationFailures = collectValidationFailures(input, nfpBoundaryTest);

  if (validationFailures.length > 0) {
    return {
      industryDisclosure: null,
      skipped: true,
      warnings: getWarnings(
        input,
        "draft",
        getReviewerAttestation(input, true),
        true,
        input.topicIdentifier ?? "",
        forProfitHealthcareScopeOnly(input.topicIdentifier ?? ""),
        validationFailures,
      ),
    };
  }

  const topicIdentifier = input.topicIdentifier as string;
  const requiresSpecialistReview = getRequiresSpecialistReview(input);
  const reviewerAttestation = getReviewerAttestation(input, requiresSpecialistReview);
  const disclosureStatus = getDisclosureStatus(input, reviewerAttestation, requiresSpecialistReview);
  const forProfitScopeOnly = forProfitHealthcareScopeOnly(topicIdentifier);
  const industryDisclosureKey = buildHealthcareDisclosureVariantKey(
    input,
    disclosureStatus,
    reviewerAttestation,
    requiresSpecialistReview,
    forProfitScopeOnly,
    nfpBoundaryTest,
  );
  const base = getSharedBase(input);
  const industryDisclosure: SyntheticIndustryDisclosure = {
    ...base,
    industryDisclosureId: buildHealthcareDisclosureVariantId(industryDisclosureKey),
    industryDisclosureKey,
    topicIdentifier,
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
    forProfitHealthcareScopeOnly: forProfitScopeOnly,
    nfpBoundaryTest,
    reviewerAttestation,
    requiresSpecialistReview,
    moduleSpecialistReviewDefaultIsTrueForHealthcare: true,
    specialistAttestationGovernanceMetadataNotCustomerFacing: true,
    version: input.version as string,
    effectiveFromDate: input.effectiveFromDate as string,
    deprecatedFromDate: input.deprecatedFromDate,
    disclosureStatus,
    activeRequiresAttestation: true,
    activeRequiresSpecialistAttestationWhenFlagged: true,
    builderNeverAuthorsContent: true,
    appendOnlyHistory: true,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    launchScope: "path_b",
    executable: false,
    derivationHash: buildDerivationHash(industryDisclosureKey, disclosureStatus),
    warnings: getWarnings(
      input,
      disclosureStatus,
      reviewerAttestation,
      requiresSpecialistReview,
      topicIdentifier,
      forProfitScopeOnly,
      [],
    ),
    industryDisclosureComplete: isIndustryDisclosureComplete(
      input,
      disclosureStatus,
      reviewerAttestation,
      requiresSpecialistReview,
    ),
  };

  return {
    industryDisclosure,
    skipped: false,
    warnings: industryDisclosure.warnings,
  };
}
