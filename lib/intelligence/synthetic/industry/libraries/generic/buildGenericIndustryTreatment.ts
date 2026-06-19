import { stableSnapshotHash } from "../../../../core/hash";
import type { SyntheticAuditScope } from "../../../audit/types";
import type { SyntheticMemoryObjectIsolationDimension } from "../../../organizational-memory/memory-object";
import type {
  IndustryBaseContract,
  IndustryTreatmentStatus,
  PhiDerivationStatus,
  RecommendationOutputClassification,
  ReviewerAttestation,
} from "../../contracts";
import {
  GENERIC_TREATMENT_11_TOPIC_IDENTIFIER,
  type GenericTreatmentApplicabilityGuard,
  type GenericTreatmentExecutionConstraints,
} from "./genericTreatment11Metadata";
import {
  GENERIC_BASELINE_TOPIC_ORDER,
  getGenericTreatmentBaselineRecord,
  type GenericBaselineTopicIdentifier,
} from "./loadGenericTreatmentBaseline";

export const GENERIC_BASELINE_TOPIC_IDENTIFIERS = GENERIC_BASELINE_TOPIC_ORDER;

export const GENERIC_LAUNCH_FRAMEWORKS = [
  "us_gaap",
  "ifrs_for_smes",
  "ifrs_iasb",
  "ifrs_eu",
] as const;

export const GENERIC_BASELINE_LAUNCH_FRAMEWORKS = ["us_gaap"] as const;

export type GenericLaunchFramework = (typeof GENERIC_LAUNCH_FRAMEWORKS)[number];
export type GenericBaselineLaunchFramework = (typeof GENERIC_BASELINE_LAUNCH_FRAMEWORKS)[number];
export type GenericTreatmentCompositionOutcome = "extendsFrameworkDefault";

const GENERIC_BASELINE_SCOPE: SyntheticAuditScope = {
  companyId: "advisacor-generic-baseline",
  customerIsolationRequired: true,
  firmIsolationRequired: true,
  clientIsolationRequired: true,
  isolationBoundaryIds: ["advisacor-generic-baseline"],
};

const GENERIC_BASELINE_CUSTOMER_ISOLATION: SyntheticMemoryObjectIsolationDimension = {
  required: true,
  referenceIds: ["advisacor-generic-baseline"],
};

const GENERIC_BASELINE_FIRM_ISOLATION: SyntheticMemoryObjectIsolationDimension = {
  required: true,
  referenceIds: ["advisacor-firm-baseline"],
};

const GENERIC_BASELINE_CLIENT_ISOLATION: SyntheticMemoryObjectIsolationDimension = {
  required: true,
  referenceIds: ["advisacor-client-baseline"],
};

const GENERIC_BASELINE_CONTRACT_DEFAULTS = {
  scope: GENERIC_BASELINE_SCOPE,
  customerIsolation: GENERIC_BASELINE_CUSTOMER_ISOLATION,
  firmIsolation: GENERIC_BASELINE_FIRM_ISOLATION,
  clientIsolation: GENERIC_BASELINE_CLIENT_ISOLATION,
  boundPhase40SnapshotHash: "phase40-baseline-handoff",
  boundPhase40_5SnapshotHash: "phase40-5-baseline-handoff",
  boundPhase41_5SnapshotHash: "phase41-5-baseline-handoff",
  boundPhase39SnapshotHash: "phase39-baseline-handoff",
  reportingFramework: "us_gaap",
  industryClassification: "generic",
  industryStatus: "active",
  containsPHI: false,
  phiDerivationStatus: "containsNoPHI",
  version: "1.0.0-recommended-baseline",
  effectiveFromDate: "2026-01-01",
  treatmentStatus: "in_review",
  advisacorRecommendedBaseline: true,
  customerFinalizesAtImplementation: true,
  customerControllerOwnsSignedModel: true,
  compositionOutcome: "extendsFrameworkDefault",
  displacementLineage: null,
  industryTreatmentComplete: false,
  priorVersionReferenceId: "",
} as const satisfies Partial<BuildGenericIndustryTreatmentInput>;

function buildBlankReviewerAttestation(): ReviewerAttestation {
  return {
    primaryReviewer: {
      identity: "",
      credentials: [],
      reviewDate: "",
      scope: "",
    },
    specialistReviewRequired: false,
    specialistReviewer: null,
    attestationStatement: "",
    reviewedAgainstAuthoritativeSources: [],
    specialistReviewOptOutJustification: null,
  };
}

function buildGenericBaselineTreatmentInput(
  topicIdentifier: GenericBaselineTopicIdentifier,
): BuildGenericIndustryTreatmentInput {
  const baselineRecord = getGenericTreatmentBaselineRecord(topicIdentifier);

  return {
    ...GENERIC_BASELINE_CONTRACT_DEFAULTS,
    topicIdentifier,
    industrySubClassification: "generic.default",
    requiresSpecialistReview: false,
    treatmentSummaryAuthored: baselineRecord.treatmentSummaryAuthored,
    citationReference: baselineRecord.citationReference,
    verificationChecklistFlags: baselineRecord.verificationChecklistFlags,
    reviewerAttestation: buildBlankReviewerAttestation(),
    ...(baselineRecord.applicabilityGuard
      ? { applicabilityGuard: baselineRecord.applicabilityGuard }
      : {}),
    ...(baselineRecord.executionConstraints
      ? { executionConstraints: baselineRecord.executionConstraints }
      : {}),
  };
}

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
  verificationChecklistFlags?: string[];
  applicabilityGuard?: GenericTreatmentApplicabilityGuard;
  executionConstraints?: GenericTreatmentExecutionConstraints;
  advisacorRecommendedBaseline?: boolean;
  customerFinalizesAtImplementation?: boolean;
  customerControllerOwnsSignedModel?: boolean;
  compositionOutcome?: GenericTreatmentCompositionOutcome;
  displacementLineage?: null;
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
  launchScope: "path_b";
  industryTreatmentComplete: boolean;
  verificationChecklistFlags: string[];
  advisacorRecommendedBaseline: boolean;
  customerFinalizesAtImplementation: boolean;
  customerControllerOwnsSignedModel: boolean;
  compositionOutcome: GenericTreatmentCompositionOutcome;
  displacementLineage: null;
  applicabilityGuard?: GenericTreatmentApplicabilityGuard;
  executionConstraints?: GenericTreatmentExecutionConstraints;
}

export interface BuildGenericIndustryTreatmentResult {
  industryTreatment: SyntheticIndustryTreatment | null;
  skipped: boolean;
  warnings: string[];
}

export const PHASE_42I_GENERIC_TREATMENT_BLUEPRINT: ReadonlyArray<BuildGenericIndustryTreatmentInput> =
  GENERIC_BASELINE_TOPIC_IDENTIFIERS.map((topicIdentifier) =>
    buildGenericBaselineTreatmentInput(topicIdentifier),
  );

const OUTPUT_CLASSIFICATION: RecommendationOutputClassification = "recommendation_for_human_review";
const DEFAULT_PHI_DERIVATION_STATUS: PhiDerivationStatus = "containsPHI";
const GENERIC_INDUSTRY_CLASSIFICATION = "generic";
const GENERIC_INDUSTRY_SUB_CLASSIFICATION = "generic.default";
const GENERIC_BASELINE_LAUNCH_SCOPE = "path_b" as const;

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
  return input.reviewerAttestation ?? buildBlankReviewerAttestation();
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
    launchScope: GENERIC_BASELINE_LAUNCH_SCOPE,
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
    launchScope: GENERIC_BASELINE_LAUNCH_SCOPE,
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
    ...(input.applicabilityGuard
      ? [
          "applicabilityGuard is a metadata declaration only; resolver enforcement is not implemented in Phase 42",
        ]
      : []),
    ...(input.executionConstraints
      ? [
          "executionConstraints are metadata declarations only; no watcher, state machine, or period-close behavior is implemented in Phase 42",
        ]
      : []),
    ...(input.advisacorRecommendedBaseline
      ? [
          "advisacor recommended baseline remains in_review on Advisacor side; customer controller finalizes at implementation",
        ]
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
    launchScope: GENERIC_BASELINE_LAUNCH_SCOPE,
    executable: false,
    derivationHash: buildDerivationHash(input, industryTreatmentKey, treatmentStatus),
    warnings: getWarnings(input, treatmentStatus, reviewerAttestation),
    industryTreatmentComplete:
      input.industryTreatmentComplete === true &&
      treatmentStatus === "active" &&
      hasPrimaryReviewerAttestation(reviewerAttestation),
    advisacorRecommendedBaseline: input.advisacorRecommendedBaseline ?? false,
    customerFinalizesAtImplementation: input.customerFinalizesAtImplementation ?? false,
    customerControllerOwnsSignedModel: input.customerControllerOwnsSignedModel ?? false,
    compositionOutcome: input.compositionOutcome ?? "extendsFrameworkDefault",
    displacementLineage: null,
    verificationChecklistFlags: input.verificationChecklistFlags ?? [],
    ...(input.applicabilityGuard ? { applicabilityGuard: input.applicabilityGuard } : {}),
    ...(input.executionConstraints ? { executionConstraints: input.executionConstraints } : {}),
  };

  return {
    industryTreatment,
    skipped: false,
    warnings: industryTreatment.warnings,
  };
}

export { GENERIC_TREATMENT_11_TOPIC_IDENTIFIER };

export type { GenericBaselineTopicIdentifier } from "./loadGenericTreatmentBaseline";
