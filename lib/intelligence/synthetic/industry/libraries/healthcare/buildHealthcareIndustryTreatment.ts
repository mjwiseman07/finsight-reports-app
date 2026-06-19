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

export const HEALTHCARE_SPECIALIST_TOPIC_IDENTIFIERS = [
  "net_patient_service_revenue",
  "contractual_allowance_reserves",
  "implicit_price_concessions",
  "denial_reserves_and_credit_loss_boundary",
  "charity_care_and_community_benefit",
  "capitation_revenue",
  "risk_sharing_value_based_care",
  "drug_pricing_program_340b",
  "medical_malpractice_accruals",
  "healthcare_specific_intangibles",
] as const;

export const HEALTHCARE_GENERALIST_TOPIC_IDENTIFIERS = [
  "healthcare_specific_fixed_assets",
  "healthcare_specific_lease_considerations",
] as const;

export const HEALTHCARE_DEFERRED_TOPIC_IDENTIFIERS = [
  "meaningful_use",
  "mips_adjustments",
  "provider_relief_fund",
] as const;

export const HEALTHCARE_LAUNCH_TOPIC_IDENTIFIERS = [
  ...HEALTHCARE_SPECIALIST_TOPIC_IDENTIFIERS,
  ...HEALTHCARE_GENERALIST_TOPIC_IDENTIFIERS,
] as const;

export const HEALTHCARE_LAUNCH_FRAMEWORKS = ["us_gaap"] as const;

export const HEALTHCARE_SCOPE_BOUNDARY_ROUTING_RULES = [
  {
    ruleIdentifier: "regulated_insurers_route_out",
    description:
      "regulated insurers (DSNP, insurance subsidiaries) fail closed; route to insurance industry when populated",
    routeToIndustry: "insurance",
  },
  {
    ruleIdentifier: "multi_location_retail_healthcare_route_out",
    description:
      "multi-location retail-format healthcare at scale fail closed; route to multi_location_retail when populated",
    routeToIndustry: "multi_location_retail",
  },
  {
    ruleIdentifier: "physician_fiduciary_trust_route_out",
    description:
      "physician fiduciary trust accounting resembling legal/CPA trust accounts fail closed; route to professional_services_specialized when populated",
    routeToIndustry: "professional_services_specialized",
  },
  {
    ruleIdentifier: "cost_report_production_classification_only",
    description:
      "cost report production (CMS-2552/2540) is a classification dimension only; production is a future phase",
    routeToIndustry: null,
  },
  {
    ruleIdentifier: "drug_pricing_program_340b_operational_controls_out_of_scope",
    description:
      "340B eligibility, clinical, and duplicate-discount-prevention controls are out of scope; owned by the covered entity's 340B compliance function",
    routeToIndustry: null,
  },
] as const;

export type HealthcareSubClassification = (typeof HEALTHCARE_SUB_CLASSIFICATIONS)[number];
export type HealthcareSpecialistTopicIdentifier = (typeof HEALTHCARE_SPECIALIST_TOPIC_IDENTIFIERS)[number];
export type HealthcareGeneralistTopicIdentifier = (typeof HEALTHCARE_GENERALIST_TOPIC_IDENTIFIERS)[number];
export type HealthcareLaunchTopicIdentifier = (typeof HEALTHCARE_LAUNCH_TOPIC_IDENTIFIERS)[number];
export type HealthcareLaunchFramework = (typeof HEALTHCARE_LAUNCH_FRAMEWORKS)[number];

const TOPIC_340B = "drug_pricing_program_340b";

const DEFAULT_REQUIRES_SPECIALIST_BY_TOPIC: Record<HealthcareLaunchTopicIdentifier, boolean> = {
  net_patient_service_revenue: true,
  contractual_allowance_reserves: true,
  implicit_price_concessions: true,
  denial_reserves_and_credit_loss_boundary: true,
  charity_care_and_community_benefit: true,
  capitation_revenue: true,
  risk_sharing_value_based_care: true,
  drug_pricing_program_340b: true,
  medical_malpractice_accruals: true,
  healthcare_specific_intangibles: true,
  healthcare_specific_fixed_assets: false,
  healthcare_specific_lease_considerations: false,
};

export interface BuildHealthcareIndustryTreatmentInput extends Partial<IndustryBaseContract> {
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
  moduleSpecialistReviewDefaultIsTrueForHealthcare: true;
  specialistAttestationGovernanceMetadataNotCustomerFacing: true;
  namedCredentialRequiredFor340B: boolean;
  isIndustryOverlayNotFrameworkBase: true;
  composesWithFrameworkTreatment: true;
  version: string;
  effectiveFromDate: string;
  deprecatedFromDate?: string;
  treatmentStatus: IndustryTreatmentStatus;
  activeRequiresAttestation: true;
  activeRequiresSpecialistAttestationWhenFlagged: true;
  builderNeverAuthorsContent: true;
  appendOnlyHistory: true;
  priorVersionReferenceId: string;
  launchScope: "path_b";
  industryTreatmentComplete: boolean;
}

export interface BuildHealthcareIndustryTreatmentResult {
  industryTreatment: SyntheticIndustryTreatment | null;
  skipped: boolean;
  warnings: string[];
}

export const PHASE_42M_HEALTHCARE_TREATMENT_BLUEPRINT: ReadonlyArray<BuildHealthcareIndustryTreatmentInput> =
  HEALTHCARE_LAUNCH_TOPIC_IDENTIFIERS.flatMap((topicIdentifier) =>
    HEALTHCARE_SUB_CLASSIFICATIONS.map((industrySubClassification) => ({
      topicIdentifier,
      reportingFramework: "us_gaap" as HealthcareLaunchFramework,
      industryClassification: "healthcare",
      industrySubClassification,
      requiresSpecialistReview: DEFAULT_REQUIRES_SPECIALIST_BY_TOPIC[topicIdentifier],
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

function isHealthcareLaunchTopic(topicIdentifier: string): topicIdentifier is HealthcareLaunchTopicIdentifier {
  return (HEALTHCARE_LAUNCH_TOPIC_IDENTIFIERS as readonly string[]).includes(topicIdentifier);
}

function isHealthcareDeferredTopic(topicIdentifier: string): boolean {
  return (HEALTHCARE_DEFERRED_TOPIC_IDENTIFIERS as readonly string[]).includes(topicIdentifier);
}

function isHealthcareSubClassification(
  industrySubClassification: string,
): industrySubClassification is HealthcareSubClassification {
  return (HEALTHCARE_SUB_CLASSIFICATIONS as readonly string[]).includes(industrySubClassification);
}

function isHealthcareLaunchFramework(
  reportingFramework: IndustryBaseContract["reportingFramework"],
): reportingFramework is HealthcareLaunchFramework {
  return (HEALTHCARE_LAUNCH_FRAMEWORKS as readonly string[]).includes(reportingFramework);
}

function getRequiresSpecialistReview(
  input: BuildHealthcareIndustryTreatmentInput,
  topicIdentifier: string,
): boolean {
  if (input.requiresSpecialistReview !== undefined) {
    return input.requiresSpecialistReview;
  }

  if (isHealthcareLaunchTopic(topicIdentifier)) {
    return DEFAULT_REQUIRES_SPECIALIST_BY_TOPIC[topicIdentifier];
  }

  return true;
}

function namedCredentialRequiredFor340B(topicIdentifier: string): boolean {
  return topicIdentifier === TOPIC_340B;
}

function getReviewerAttestation(
  input: BuildHealthcareIndustryTreatmentInput,
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

function has340BCredentialInSpecialistReviewer(reviewerAttestation: ReviewerAttestation): boolean {
  const specialistReviewer = reviewerAttestation.specialistReviewer;

  if (!specialistReviewer) {
    return false;
  }

  const has340BCredential = specialistReviewer.credentials.some((credential) =>
    credential.toLowerCase().includes("340b"),
  );
  const has340BSpecialization =
    specialistReviewer.specialization.toLowerCase().includes("340b") ||
    specialistReviewer.specialization === "340B_compliance";

  return has340BCredential || has340BSpecialization;
}

function getTreatmentStatus(
  input: BuildHealthcareIndustryTreatmentInput,
  reviewerAttestation: ReviewerAttestation,
  requiresSpecialistReview: boolean,
  topicIdentifier: string,
): IndustryTreatmentStatus {
  const requestedStatus = input.treatmentStatus ?? "draft";

  if (requestedStatus === "active") {
    if (!hasPrimaryReviewerAttestation(reviewerAttestation)) {
      return "in_review";
    }

    if (requiresSpecialistReview && !hasSpecialistReviewerAttestation(reviewerAttestation)) {
      return "in_review";
    }

    if (
      namedCredentialRequiredFor340B(topicIdentifier) &&
      !has340BCredentialInSpecialistReviewer(reviewerAttestation) &&
      !hasCompleteSpecialistReviewOptOut(reviewerAttestation.specialistReviewOptOutJustification)
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

function getSharedBase(input: BuildHealthcareIndustryTreatmentInput): IndustryBaseContract {
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

function collectMissingRequiredIdentifiers(input: BuildHealthcareIndustryTreatmentInput): string[] {
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

function collectValidationFailures(input: BuildHealthcareIndustryTreatmentInput): string[] {
  const failures: string[] = [];
  const topicIdentifier = input.topicIdentifier ?? "";

  if (input.reportingFramework && !isHealthcareLaunchFramework(input.reportingFramework)) {
    failures.push("reportingFramework must be us_gaap for healthcare launch scope");
  }

  if (isHealthcareDeferredTopic(topicIdentifier)) {
    failures.push(`topicIdentifier ${topicIdentifier} is deferred from healthcare launch scope`);
  }

  if (hasValue(topicIdentifier) && !isHealthcareLaunchTopic(topicIdentifier)) {
    failures.push(`topicIdentifier ${topicIdentifier} is outside the healthcare launch topic library`);
  }

  return failures;
}

function buildHealthcareIndustryTreatmentKey(
  input: BuildHealthcareIndustryTreatmentInput,
  treatmentStatus: IndustryTreatmentStatus,
  reviewerAttestation: ReviewerAttestation,
  requiresSpecialistReview: boolean,
  namedCredential340B: boolean,
): string {
  return stableSnapshotHash({
    topicIdentifier: input.topicIdentifier ?? "",
    industryClassification: HEALTHCARE_INDUSTRY_CLASSIFICATION,
    industrySubClassification: input.industrySubClassification ?? "",
    reportingFramework: input.reportingFramework ?? "",
    version: input.version ?? "",
    effectiveFromDate: input.effectiveFromDate ?? "",
    treatmentStatus,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    citationReference: input.citationReference ?? "",
    primaryReviewerIdentity: reviewerAttestation.primaryReviewer.identity,
    primaryReviewerReviewDate: reviewerAttestation.primaryReviewer.reviewDate,
    requiresSpecialistReview,
    namedCredentialRequiredFor340B: namedCredential340B,
    launchScope: "path_b",
  });
}

function buildHealthcareIndustryTreatmentId(industryTreatmentKey: string): string {
  return `synthetic-industry-treatment:${stableSnapshotHash({
    industryTreatmentKey,
    artifactType: "SyntheticIndustryTreatment",
  })}`;
}

function buildDerivationHash(
  industryTreatmentKey: string,
  treatmentStatus: IndustryTreatmentStatus,
): string {
  return stableSnapshotHash({
    industryTreatmentKey,
    activeRequiresAttestation: true,
    activeRequiresSpecialistAttestationWhenFlagged: true,
    builderNeverAuthorsContent: true,
    citationIsReferenceOnlyNeverReproducedText: true,
    containsCopyrightedText: false,
    isIndustryOverlayNotFrameworkBase: true,
    composesWithFrameworkTreatment: true,
    moduleSpecialistReviewDefaultIsTrueForHealthcare: true,
    specialistAttestationGovernanceMetadataNotCustomerFacing: true,
    appendOnlyHistory: true,
    launchScope: "path_b",
    treatmentStatus,
  });
}

function getScopeBoundaryWarnings(): string[] {
  return HEALTHCARE_SCOPE_BOUNDARY_ROUTING_RULES.map(
    (rule) => `scope-boundary routing: ${rule.ruleIdentifier} — ${rule.description}`,
  );
}

function getWarnings(
  input: BuildHealthcareIndustryTreatmentInput,
  treatmentStatus: IndustryTreatmentStatus,
  reviewerAttestation: ReviewerAttestation,
  requiresSpecialistReview: boolean,
  topicIdentifier: string,
  validationFailures: string[],
): string[] {
  const namedCredential340B = namedCredentialRequiredFor340B(topicIdentifier);

  return [
    ...getInputArray(input.warnings),
    ...validationFailures.map((failure) => `healthcare treatment failed closed: ${failure}`),
    ...(input.treatmentStatus === "active" && treatmentStatus === "in_review"
      ? [
          namedCredential340B
            ? "340B treatment marked active without primary reviewer, specialist reviewer with 340B credential, or complete opt-out; forced to in_review"
            : requiresSpecialistReview
              ? "healthcare treatment marked active without primary reviewer and specialist attestation; forced to in_review"
              : "treatment marked active without primary reviewer identity and reviewDate; forced to in_review",
        ]
      : []),
    ...(!hasValue(input.treatmentSummaryAuthored)
      ? ["treatmentSummaryAuthored is human-authored input; draft structure retained until content is supplied"]
      : []),
    ...(!hasValue(input.citationReference)
      ? ["citationReference holds a standard/source reference only, never reproduced text"]
      : []),
    ...(requiresSpecialistReview &&
    !hasSpecialistReviewerAttestation(reviewerAttestation) &&
    treatmentStatus !== "active"
      ? ["requiresSpecialistReview topic remains non-active until specialistReviewer attestation or complete specialistReviewOptOutJustification"]
      : []),
    ...(namedCredential340B &&
    requiresSpecialistReview &&
    !has340BCredentialInSpecialistReviewer(reviewerAttestation) &&
    !hasCompleteSpecialistReviewOptOut(reviewerAttestation.specialistReviewOptOutJustification)
      ? ["drug_pricing_program_340b requires specialistReviewer with documented 340B-specific credential or complete opt-out"]
      : []),
    ...(topicIdentifier === "charity_care_and_community_benefit"
      ? ["charity_care_and_community_benefit is for-profit healthcare presentation only; NFP / ASC 958 is out of scope"]
      : []),
    ...(topicIdentifier === "risk_sharing_value_based_care"
      ? ["risk_sharing_value_based_care is provider-side only; regulated insurers route out per scope-boundary rules"]
      : []),
    ...(namedCredential340B
      ? ["drug_pricing_program_340b covers accounting for participation only; eligibility and operational controls are out of scope"]
      : []),
    ...getScopeBoundaryWarnings(),
    "specialist attestation identity and credentials are internal governance provenance and are not customer-facing",
    ...(treatmentStatus !== "active"
      ? ["treatment remains draft or in_review until attestation requirements are complete"]
      : []),
    "metadata-only healthcare treatment library structure; builder never authors content and treatment accuracy against real healthcare transactions is on the real-data test register",
  ];
}

function isIndustryTreatmentComplete(
  input: BuildHealthcareIndustryTreatmentInput,
  treatmentStatus: IndustryTreatmentStatus,
  reviewerAttestation: ReviewerAttestation,
  requiresSpecialistReview: boolean,
  topicIdentifier: string,
): boolean {
  if (input.industryTreatmentComplete !== true || treatmentStatus !== "active") {
    return false;
  }

  if (!hasPrimaryReviewerAttestation(reviewerAttestation)) {
    return false;
  }

  if (requiresSpecialistReview && !hasSpecialistReviewerAttestation(reviewerAttestation)) {
    return false;
  }

  if (
    namedCredentialRequiredFor340B(topicIdentifier) &&
    !has340BCredentialInSpecialistReviewer(reviewerAttestation) &&
    !hasCompleteSpecialistReviewOptOut(reviewerAttestation.specialistReviewOptOutJustification)
  ) {
    return false;
  }

  return true;
}

export function buildHealthcareIndustryTreatment(
  input: BuildHealthcareIndustryTreatmentInput,
): BuildHealthcareIndustryTreatmentResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      industryTreatment: null,
      skipped: true,
      warnings: [
        `missing required healthcare industry treatment identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const validationFailures = collectValidationFailures(input);

  if (validationFailures.length > 0) {
    return {
      industryTreatment: null,
      skipped: true,
      warnings: getWarnings(
        input,
        "draft",
        getReviewerAttestation(input, true),
        true,
        input.topicIdentifier ?? "",
        validationFailures,
      ),
    };
  }

  const topicIdentifier = input.topicIdentifier as string;
  const requiresSpecialistReview = getRequiresSpecialistReview(input, topicIdentifier);
  const reviewerAttestation = getReviewerAttestation(input, requiresSpecialistReview);
  const treatmentStatus = getTreatmentStatus(
    input,
    reviewerAttestation,
    requiresSpecialistReview,
    topicIdentifier,
  );
  const namedCredential340B = namedCredentialRequiredFor340B(topicIdentifier);
  const industryTreatmentKey = buildHealthcareIndustryTreatmentKey(
    input,
    treatmentStatus,
    reviewerAttestation,
    requiresSpecialistReview,
    namedCredential340B,
  );
  const base = getSharedBase(input);
  const industryTreatment: SyntheticIndustryTreatment = {
    ...base,
    industryTreatmentId: buildHealthcareIndustryTreatmentId(industryTreatmentKey),
    industryTreatmentKey,
    topicIdentifier,
    treatmentSummaryAuthored: input.treatmentSummaryAuthored ?? "",
    citationReference: input.citationReference ?? "",
    containsCopyrightedText: false,
    citationIsReferenceOnlyNeverReproducedText: true,
    reviewerAttestation,
    requiresSpecialistReview,
    moduleSpecialistReviewDefaultIsTrueForHealthcare: true,
    specialistAttestationGovernanceMetadataNotCustomerFacing: true,
    namedCredentialRequiredFor340B: namedCredential340B,
    isIndustryOverlayNotFrameworkBase: true,
    composesWithFrameworkTreatment: true,
    version: input.version as string,
    effectiveFromDate: input.effectiveFromDate as string,
    deprecatedFromDate: input.deprecatedFromDate,
    treatmentStatus,
    activeRequiresAttestation: true,
    activeRequiresSpecialistAttestationWhenFlagged: true,
    builderNeverAuthorsContent: true,
    appendOnlyHistory: true,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    launchScope: "path_b",
    executable: false,
    derivationHash: buildDerivationHash(industryTreatmentKey, treatmentStatus),
    warnings: getWarnings(
      input,
      treatmentStatus,
      reviewerAttestation,
      requiresSpecialistReview,
      topicIdentifier,
      [],
    ),
    industryTreatmentComplete: isIndustryTreatmentComplete(
      input,
      treatmentStatus,
      reviewerAttestation,
      requiresSpecialistReview,
      topicIdentifier,
    ),
  };

  return {
    industryTreatment,
    skipped: false,
    warnings: industryTreatment.warnings,
  };
}
