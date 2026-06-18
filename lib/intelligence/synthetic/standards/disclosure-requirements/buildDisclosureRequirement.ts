import { stableSnapshotHash } from "../../../core/hash";
import type { StandardsBaseContract, StandardsReportingFramework } from "../contracts";

export interface BuildDisclosureRequirementInput extends Partial<StandardsBaseContract> {
  topicIdentifier?: string;
  linkedTreatmentReferenceId?: string;
  disclosureSummaryAuthored?: string;
  disclosureCitationReference?: string;
  version?: string;
  effectiveFromDate?: string;
  isHumanReviewed?: boolean;
  disclosureMarkedActive?: boolean;
  reviewerIdentity?: string;
  reviewDate?: string;
  reviewAttestationReferenceId?: string;
  priorVersionReferenceId?: string;
  disclosureRequirementComplete?: boolean;
}

export interface SyntheticDisclosureRequirement extends StandardsBaseContract {
  disclosureRequirementId: string;
  disclosureRequirementKey: string;
  topicIdentifier: string;
  reportingFramework: StandardsReportingFramework;
  linkedTreatmentReferenceId: string;
  disclosureSummaryAuthored: string;
  disclosureCitationReference: string;
  version: string;
  effectiveFromDate: string;
  isHumanReviewed: boolean;
  reviewerIdentity: string;
  reviewDate: string;
  reviewAttestationReferenceId: string;
  activeRequiresReviewAttestation: true;
  containsCopyrightedText: false;
  citationIsReferenceOnlyNeverReproducedText: true;
  builderNeverAuthorsContent: true;
  frameworkTaggedNeverBleedsAcrossFrameworks: true;
  consumedByDownstreamReportingPhase: true;
  downstreamChecklistGenerationIsPhase45: true;
  priorVersionReferenceId: string;
  appendOnlyHistory: true;
  disclosureRequirementComplete: boolean;
}

export interface BuildDisclosureRequirementResult {
  disclosureRequirement: SyntheticDisclosureRequirement | null;
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

function hasReviewAttestation(input: BuildDisclosureRequirementInput): boolean {
  return (
    hasValue(input.reviewerIdentity) &&
    hasValue(input.reviewDate) &&
    hasValue(input.reviewAttestationReferenceId)
  );
}

function wasMarkedActive(input: BuildDisclosureRequirementInput): boolean {
  return input.isHumanReviewed === true || input.disclosureMarkedActive === true;
}

function getIsHumanReviewed(input: BuildDisclosureRequirementInput): boolean {
  if (!wasMarkedActive(input)) {
    return false;
  }

  return hasReviewAttestation(input);
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
    reportingFramework: input.reportingFramework as StandardsReportingFramework,
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

function collectMissingRequiredIdentifiers(input: BuildDisclosureRequirementInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.topicIdentifier)) {
    missing.push("topicIdentifier");
  }

  if (!input.reportingFramework) {
    missing.push("reportingFramework");
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

function buildDisclosureRequirementKey(input: BuildDisclosureRequirementInput): string {
  return stableSnapshotHash({
    topicIdentifier: input.topicIdentifier ?? "",
    reportingFramework: input.reportingFramework ?? "",
    linkedTreatmentReferenceId: input.linkedTreatmentReferenceId ?? "",
    disclosureCitationReference: input.disclosureCitationReference ?? "",
    version: input.version ?? "",
    effectiveFromDate: input.effectiveFromDate ?? "",
    isHumanReviewed: getIsHumanReviewed(input),
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    reviewAttestationReferenceId: input.reviewAttestationReferenceId ?? "",
  });
}

function buildDisclosureRequirementId(input: BuildDisclosureRequirementInput): string {
  return `synthetic-disclosure-requirement:${stableSnapshotHash({
    disclosureRequirementKey: buildDisclosureRequirementKey(input),
    artifactType: "SyntheticDisclosureRequirement",
  })}`;
}

function buildDerivationHash(input: BuildDisclosureRequirementInput): string {
  return stableSnapshotHash({
    disclosureRequirementKey: buildDisclosureRequirementKey(input),
    activeRequiresReviewAttestation: true,
    containsCopyrightedText: false,
    citationIsReferenceOnlyNeverReproducedText: true,
    builderNeverAuthorsContent: true,
    frameworkTaggedNeverBleedsAcrossFrameworks: true,
    consumedByDownstreamReportingPhase: true,
    downstreamChecklistGenerationIsPhase45: true,
    appendOnlyHistory: true,
    isHumanReviewed: getIsHumanReviewed(input),
    reportingFramework: input.reportingFramework ?? "",
  });
}

function getWarnings(
  input: BuildDisclosureRequirementInput,
  isHumanReviewed: boolean,
): string[] {
  return [
    ...getInputArray(input.warnings),
    ...(wasMarkedActive(input) && !isHumanReviewed
      ? ["disclosure requirement marked active without reviewer identity, review date, or attestation; forced to non-active"]
      : []),
    ...(!hasValue(input.disclosureSummaryAuthored)
      ? ["disclosure summary is human-authored input; draft structure retained until content is supplied"]
      : []),
    ...(!hasValue(input.linkedTreatmentReferenceId)
      ? ["disclosure requirement should link to the recognition/measurement treatment it accompanies"]
      : []),
    ...(!hasValue(input.disclosureCitationReference)
      ? ["disclosureCitationReference should hold a standard reference only, never reproduced text"]
      : []),
    ...(!isHumanReviewed
      ? ["disclosure requirement remains non-active until human review attestation is complete"]
      : []),
    "metadata-only disclosure requirements layer; builder never authors content and generates no checklist — Phase 45 consumes this layer downstream",
  ];
}

export function buildDisclosureRequirement(
  input: BuildDisclosureRequirementInput,
): BuildDisclosureRequirementResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      disclosureRequirement: null,
      skipped: true,
      warnings: [
        `missing required disclosure requirement identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const requiredTopicIdentifier = input.topicIdentifier as string;
  const requiredReportingFramework = input.reportingFramework as StandardsReportingFramework;
  const requiredVersion = input.version as string;
  const requiredEffectiveFromDate = input.effectiveFromDate as string;
  const isHumanReviewed = getIsHumanReviewed(input);
  const base = getSharedBase({
    ...input,
    reportingFramework: requiredReportingFramework,
  });
  const disclosureRequirement: SyntheticDisclosureRequirement = {
    ...base,
    disclosureRequirementId: buildDisclosureRequirementId(input),
    disclosureRequirementKey: buildDisclosureRequirementKey(input),
    topicIdentifier: requiredTopicIdentifier,
    reportingFramework: requiredReportingFramework,
    linkedTreatmentReferenceId: input.linkedTreatmentReferenceId ?? "",
    disclosureSummaryAuthored: input.disclosureSummaryAuthored ?? "",
    disclosureCitationReference: input.disclosureCitationReference ?? "",
    version: requiredVersion,
    effectiveFromDate: requiredEffectiveFromDate,
    isHumanReviewed,
    reviewerIdentity: input.reviewerIdentity ?? "",
    reviewDate: input.reviewDate ?? "",
    reviewAttestationReferenceId: input.reviewAttestationReferenceId ?? "",
    activeRequiresReviewAttestation: true,
    containsCopyrightedText: false,
    citationIsReferenceOnlyNeverReproducedText: true,
    builderNeverAuthorsContent: true,
    frameworkTaggedNeverBleedsAcrossFrameworks: true,
    consumedByDownstreamReportingPhase: true,
    downstreamChecklistGenerationIsPhase45: true,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    appendOnlyHistory: true,
    executable: false,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input, isHumanReviewed),
    disclosureRequirementComplete:
      input.disclosureRequirementComplete === true && isHumanReviewed,
  };

  return {
    disclosureRequirement,
    skipped: false,
    warnings: disclosureRequirement.warnings,
  };
}
