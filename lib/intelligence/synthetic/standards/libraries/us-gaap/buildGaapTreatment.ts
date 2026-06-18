import { stableSnapshotHash } from "../../../../core/hash";
import type {
  StandardsBaseContract,
  StandardsReportingFramework,
  StandardsTreatmentStatus,
} from "../../contracts";

export const US_GAAP_ASC_TOPIC_SCAFFOLD: Record<string, string> = {
  revenue_recognition: "ASC 606",
  leases: "ASC 842",
  ppe: "ASC 360",
  inventory: "ASC 330",
  impairment_long_lived: "ASC 360",
  financial_instruments: "ASC 825, ASC 326",
  income_taxes: "ASC 740",
  stock_compensation: "ASC 718",
  business_combinations: "ASC 805",
  consolidation: "ASC 810",
  foreign_currency: "ASC 830",
  eps: "ASC 260",
  segment_reporting: "ASC 280",
  subsequent_events: "ASC 855",
  going_concern: "ASC 205-40",
  accruals_prepaids: "various",
  capitalization_vs_expense: "various",
  goodwill: "ASC 350",
  intangibles: "ASC 350",
  contingencies: "ASC 450",
  fair_value: "ASC 820",
  cash_flow: "ASC 230",
  interim_reporting: "ASC 270",
  discontinued_operations: "ASC 205-20",
};

export interface BuildGaapTreatmentInput extends Partial<StandardsBaseContract> {
  topicIdentifier?: string;
  ascReference?: string;
  treatmentSummaryAuthored?: string;
  disclosureRequirementReferenceIds?: string[];
  commonPitfallsAuthored?: string[];
  version?: string;
  effectiveFromDate?: string;
  isHumanReviewed?: boolean;
  reviewerIdentity?: string;
  reviewDate?: string;
  reviewAttestationReferenceId?: string;
  treatmentStatus?: StandardsTreatmentStatus;
  priorVersionReferenceId?: string;
  gaapTreatmentComplete?: boolean;
}

export interface SyntheticGaapTreatment extends StandardsBaseContract {
  gaapTreatmentId: string;
  gaapTreatmentKey: string;
  topicIdentifier: string;
  ascReference: string;
  reportingFramework: "us_gaap";
  treatmentSummaryAuthored: string;
  disclosureRequirementReferenceIds: string[];
  commonPitfallsAuthored: string[];
  version: string;
  effectiveFromDate: string;
  isHumanReviewed: boolean;
  reviewerIdentity: string;
  reviewDate: string;
  reviewAttestationReferenceId: string;
  treatmentStatus: StandardsTreatmentStatus;
  activeRequiresReviewAttestation: true;
  containsCopyrightedText: false;
  citationIsReferenceOnlyNeverReproducedText: true;
  builderNeverAuthorsContent: true;
  priorVersionReferenceId: string;
  appendOnlyHistory: true;
  gaapTreatmentComplete: boolean;
}

export interface BuildGaapTreatmentResult {
  gaapTreatment: SyntheticGaapTreatment | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function hasReviewAttestation(input: BuildGaapTreatmentInput): boolean {
  return (
    input.isHumanReviewed === true &&
    hasValue(input.reviewerIdentity) &&
    hasValue(input.reviewDate) &&
    hasValue(input.reviewAttestationReferenceId)
  );
}

function getTreatmentStatus(input: BuildGaapTreatmentInput): StandardsTreatmentStatus {
  const requestedStatus = input.treatmentStatus ?? "draft";

  if (requestedStatus === "active" && !hasReviewAttestation(input)) {
    return "in_review";
  }

  if (requestedStatus === "superseded") {
    return "superseded";
  }

  if (requestedStatus === "active" && hasReviewAttestation(input)) {
    return "active";
  }

  if (requestedStatus === "in_review") {
    return "in_review";
  }

  return "draft";
}

function getScaffoldAscReference(topicIdentifier: string): string | undefined {
  return US_GAAP_ASC_TOPIC_SCAFFOLD[topicIdentifier];
}

function getSharedBase(input: Partial<StandardsBaseContract>): StandardsBaseContract {
  return {
    phase40OrganizationalHandoffHandle: input.phase40OrganizationalHandoffHandle ?? "",
    phase40_5IntegrationHandoffHandle: input.phase40_5IntegrationHandoffHandle ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase40_5SnapshotHash: input.boundPhase40_5SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    phase41_5StaleMarker: input.phase41_5StaleMarker ?? "current",
    executable: false,
    executionReady: input.executionReady === true,
    scope: input.scope,
    customerIsolation: input.customerIsolation,
    firmIsolation: input.firmIsolation,
    clientIsolation: input.clientIsolation,
    reportingFramework: "us_gaap" as StandardsReportingFramework,
    containsPHI: getContainsPHI(input.containsPHI),
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
  } as StandardsBaseContract;
}

function collectMissingRequiredIdentifiers(input: BuildGaapTreatmentInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.topicIdentifier)) {
    missing.push("topicIdentifier");
  }

  if (!hasValue(input.ascReference)) {
    missing.push("ascReference");
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

  if (!hasValue(input.boundPhase39SnapshotHash)) {
    missing.push("boundPhase39SnapshotHash");
  }

  if (!hasValue(input.boundPhase38SnapshotHash)) {
    missing.push("boundPhase38SnapshotHash");
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

function buildGaapTreatmentKey(input: BuildGaapTreatmentInput): string {
  return stableSnapshotHash({
    topicIdentifier: input.topicIdentifier ?? "",
    ascReference: input.ascReference ?? "",
    reportingFramework: "us_gaap",
    version: input.version ?? "",
    effectiveFromDate: input.effectiveFromDate ?? "",
    treatmentStatus: getTreatmentStatus(input),
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    reviewAttestationReferenceId: input.reviewAttestationReferenceId ?? "",
  });
}

function buildGaapTreatmentId(input: BuildGaapTreatmentInput): string {
  return `synthetic-gaap-treatment:${stableSnapshotHash({
    gaapTreatmentKey: buildGaapTreatmentKey(input),
    artifactType: "SyntheticGaapTreatment",
  })}`;
}

function buildDerivationHash(input: BuildGaapTreatmentInput): string {
  return stableSnapshotHash({
    gaapTreatmentKey: buildGaapTreatmentKey(input),
    activeRequiresReviewAttestation: true,
    containsCopyrightedText: false,
    citationIsReferenceOnlyNeverReproducedText: true,
    builderNeverAuthorsContent: true,
    appendOnlyHistory: true,
    treatmentStatus: getTreatmentStatus(input),
  });
}

function getWarnings(
  input: BuildGaapTreatmentInput,
  treatmentStatus: StandardsTreatmentStatus,
): string[] {
  const topicIdentifier = input.topicIdentifier ?? "";
  const scaffoldAscReference = getScaffoldAscReference(topicIdentifier);

  return [
    ...getInputArray(input.warnings),
    ...(input.treatmentStatus === "active" && treatmentStatus === "in_review"
      ? ["treatment marked active without reviewer identity, review date, or attestation; forced to in_review"]
      : []),
    ...(!hasValue(input.treatmentSummaryAuthored)
      ? ["treatment summary is human-authored input; draft structure retained until content is supplied"]
      : []),
    ...(scaffoldAscReference && input.ascReference !== scaffoldAscReference
      ? [`ascReference differs from library scaffold for ${topicIdentifier}: expected ${scaffoldAscReference}`]
      : []),
    ...(!scaffoldAscReference && hasValue(topicIdentifier)
      ? [`topicIdentifier ${topicIdentifier} is outside the US GAAP ASC topic scaffold`]
      : []),
    ...(treatmentStatus !== "active"
      ? ["treatment remains draft or in_review until human review attestation is complete"]
      : []),
    "metadata-only US GAAP treatment library structure; builder never authors content and does not confirm treatment accuracy — attestation confirms review marking only",
  ];
}

export function buildGaapTreatment(input: BuildGaapTreatmentInput): BuildGaapTreatmentResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      gaapTreatment: null,
      skipped: true,
      warnings: [`missing required GAAP treatment identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const requiredTopicIdentifier = input.topicIdentifier as string;
  const requiredAscReference = input.ascReference as string;
  const requiredVersion = input.version as string;
  const requiredEffectiveFromDate = input.effectiveFromDate as string;
  const treatmentStatus = getTreatmentStatus(input);
  const base = getSharedBase(input);
  const gaapTreatment: SyntheticGaapTreatment = {
    ...base,
    gaapTreatmentId: buildGaapTreatmentId(input),
    gaapTreatmentKey: buildGaapTreatmentKey(input),
    topicIdentifier: requiredTopicIdentifier,
    ascReference: requiredAscReference,
    reportingFramework: "us_gaap",
    treatmentSummaryAuthored: input.treatmentSummaryAuthored ?? "",
    disclosureRequirementReferenceIds: getInputArray(input.disclosureRequirementReferenceIds),
    commonPitfallsAuthored: getInputArray(input.commonPitfallsAuthored),
    version: requiredVersion,
    effectiveFromDate: requiredEffectiveFromDate,
    isHumanReviewed: input.isHumanReviewed === true,
    reviewerIdentity: input.reviewerIdentity ?? "",
    reviewDate: input.reviewDate ?? "",
    reviewAttestationReferenceId: input.reviewAttestationReferenceId ?? "",
    treatmentStatus,
    activeRequiresReviewAttestation: true,
    containsCopyrightedText: false,
    citationIsReferenceOnlyNeverReproducedText: true,
    builderNeverAuthorsContent: true,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    appendOnlyHistory: true,
    executable: false,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input, treatmentStatus),
    gaapTreatmentComplete:
      input.gaapTreatmentComplete === true &&
      treatmentStatus === "active" &&
      hasReviewAttestation(input),
  };

  return {
    gaapTreatment,
    skipped: false,
    warnings: gaapTreatment.warnings,
  };
}
