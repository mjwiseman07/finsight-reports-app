import { stableSnapshotHash } from "../../../core/hash";
import type { StandardsBaseContract, StandardsReportingFramework } from "../contracts";

export type TreatmentResolutionMode = "single_framework" | "multi_framework";

export type TreatmentResolutionStatus = "resolved" | "fail_closed";

export type TreatmentResolutionFailClosedReason =
  | "none"
  | "framework_not_active"
  | "topic_unpopulated"
  | "treatment_not_reviewed"
  | "framework_undeterminable";

export interface BuildTreatmentResolutionInput extends Partial<StandardsBaseContract> {
  topicIdentifier?: string;
  entityId?: string;
  resolvedReportingFramework?: StandardsReportingFramework;
  effectiveDate?: string;
  resolutionMode?: TreatmentResolutionMode;
  resolvedTreatmentReferenceId?: string;
  resolvedTreatmentVersion?: string;
  resolvedTreatmentEffectiveFromDate?: string;
  resolvedCitationReference?: string;
  resolvedReviewerIdentity?: string;
  resolvedReviewDate?: string;
  resolutionStatus?: TreatmentResolutionStatus;
  failClosedReason?: TreatmentResolutionFailClosedReason;
  frameworkIsActive?: boolean;
  topicIsPopulated?: boolean;
  treatmentIsHumanReviewed?: boolean;
  multiFrameworkPrimaryReferenceId?: string;
  multiFrameworkSecondaryReferenceIds?: string[];
  treatmentResolutionComplete?: boolean;
}

export interface SyntheticTreatmentResolution extends StandardsBaseContract {
  treatmentResolutionId: string;
  treatmentResolutionKey: string;
  topicIdentifier: string;
  entityId: string;
  resolvedReportingFramework: StandardsReportingFramework;
  effectiveDate: string;
  resolverIsSingleInterfaceForRoles: true;
  rolesNeverReferenceFrameworkContentDirectly: true;
  resolutionMode: TreatmentResolutionMode;
  resolvedTreatmentReferenceId: string;
  resolvedTreatmentVersion: string;
  resolvedTreatmentEffectiveFromDate: string;
  resolvedCitationReference: string;
  resolvedReviewerIdentity: string;
  resolvedReviewDate: string;
  resolutionStatus: TreatmentResolutionStatus;
  failClosedReason: TreatmentResolutionFailClosedReason;
  failsClosedOnNonActiveFramework: true;
  failsClosedOnUnpopulatedTopic: true;
  failsClosedOnUnreviewedTreatment: true;
  neverSilentlyDefaultsFramework: true;
  historicalResolutionByEffectiveDate: true;
  multiFrameworkPrimaryReferenceId: string;
  multiFrameworkSecondaryReferenceIds: string[];
  treatmentResolutionComplete: boolean;
}

export interface BuildTreatmentResolutionResult {
  treatmentResolution: SyntheticTreatmentResolution | null;
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

function collectMissingRequiredIdentifiers(input: BuildTreatmentResolutionInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.topicIdentifier)) {
    missing.push("topicIdentifier");
  }

  if (!hasValue(input.entityId)) {
    missing.push("entityId");
  }

  if (!input.resolvedReportingFramework) {
    missing.push("resolvedReportingFramework");
  }

  if (!input.reportingFramework) {
    missing.push("reportingFramework");
  }

  if (!hasValue(input.effectiveDate)) {
    missing.push("effectiveDate");
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

function getFailClosedReason(input: BuildTreatmentResolutionInput): TreatmentResolutionFailClosedReason {
  if (!input.resolvedReportingFramework || !input.reportingFramework) {
    return "framework_undeterminable";
  }

  if (input.frameworkIsActive === false) {
    return "framework_not_active";
  }

  if (input.topicIsPopulated === false) {
    return "topic_unpopulated";
  }

  if (input.treatmentIsHumanReviewed === false) {
    return "treatment_not_reviewed";
  }

  return input.failClosedReason ?? "none";
}

function getResolutionStatus(input: BuildTreatmentResolutionInput): TreatmentResolutionStatus {
  return getFailClosedReason(input) === "none" ? input.resolutionStatus ?? "resolved" : "fail_closed";
}

function buildTreatmentResolutionKey(input: BuildTreatmentResolutionInput): string {
  return stableSnapshotHash({
    topicIdentifier: input.topicIdentifier ?? "",
    entityId: input.entityId ?? "",
    resolvedReportingFramework: input.resolvedReportingFramework ?? "",
    effectiveDate: input.effectiveDate ?? "",
    resolutionMode: input.resolutionMode ?? "single_framework",
    resolvedTreatmentReferenceId: input.resolvedTreatmentReferenceId ?? "",
    resolvedTreatmentVersion: input.resolvedTreatmentVersion ?? "",
    resolvedTreatmentEffectiveFromDate: input.resolvedTreatmentEffectiveFromDate ?? "",
    resolvedCitationReference: input.resolvedCitationReference ?? "",
    failClosedReason: getFailClosedReason(input),
    multiFrameworkPrimaryReferenceId: input.multiFrameworkPrimaryReferenceId ?? "",
    multiFrameworkSecondaryReferenceIds: getInputArray(input.multiFrameworkSecondaryReferenceIds),
  });
}

function buildTreatmentResolutionId(input: BuildTreatmentResolutionInput): string {
  return `synthetic-treatment-resolution:${stableSnapshotHash({
    treatmentResolutionKey: buildTreatmentResolutionKey(input),
    artifactType: "SyntheticTreatmentResolution",
  })}`;
}

function buildDerivationHash(input: BuildTreatmentResolutionInput): string {
  return stableSnapshotHash({
    treatmentResolutionKey: buildTreatmentResolutionKey(input),
    resolverIsSingleInterfaceForRoles: true,
    rolesNeverReferenceFrameworkContentDirectly: true,
    resolutionStatus: getResolutionStatus(input),
    failClosedReason: getFailClosedReason(input),
    failsClosedOnNonActiveFramework: true,
    failsClosedOnUnpopulatedTopic: true,
    failsClosedOnUnreviewedTreatment: true,
    neverSilentlyDefaultsFramework: true,
    historicalResolutionByEffectiveDate: true,
  });
}

function getWarnings(
  input: BuildTreatmentResolutionInput,
  resolutionStatus: TreatmentResolutionStatus,
  failClosedReason: TreatmentResolutionFailClosedReason,
): string[] {
  return [
    ...getInputArray(input.warnings),
    ...(resolutionStatus === "fail_closed" ? [`treatment resolution failed closed: ${failClosedReason}`] : []),
    ...(input.resolutionMode === "multi_framework" &&
    (!hasValue(input.multiFrameworkPrimaryReferenceId) || getInputArray(input.multiFrameworkSecondaryReferenceIds).length === 0)
      ? ["multi-framework resolution should preserve primary and secondary resolution references"]
      : []),
    "metadata-only resolver contract; live lookup against authored content and entity configuration is deferred to real-data validation",
  ];
}

export function buildTreatmentResolution(input: BuildTreatmentResolutionInput): BuildTreatmentResolutionResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      treatmentResolution: null,
      skipped: true,
      warnings: [`missing required treatment resolution identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const requiredTopicIdentifier = input.topicIdentifier as string;
  const requiredEntityId = input.entityId as string;
  const requiredResolvedReportingFramework = input.resolvedReportingFramework as StandardsReportingFramework;
  const requiredEffectiveDate = input.effectiveDate as string;
  const failClosedReason = getFailClosedReason(input);
  const resolutionStatus = getResolutionStatus(input);
  const base = getSharedBase(input);
  const treatmentResolution: SyntheticTreatmentResolution = {
    ...base,
    treatmentResolutionId: buildTreatmentResolutionId(input),
    treatmentResolutionKey: buildTreatmentResolutionKey(input),
    topicIdentifier: requiredTopicIdentifier,
    entityId: requiredEntityId,
    resolvedReportingFramework: requiredResolvedReportingFramework,
    effectiveDate: requiredEffectiveDate,
    resolverIsSingleInterfaceForRoles: true,
    rolesNeverReferenceFrameworkContentDirectly: true,
    resolutionMode: input.resolutionMode ?? "single_framework",
    resolvedTreatmentReferenceId: resolutionStatus === "resolved" ? input.resolvedTreatmentReferenceId ?? "" : "",
    resolvedTreatmentVersion: resolutionStatus === "resolved" ? input.resolvedTreatmentVersion ?? "" : "",
    resolvedTreatmentEffectiveFromDate:
      resolutionStatus === "resolved" ? input.resolvedTreatmentEffectiveFromDate ?? "" : "",
    resolvedCitationReference: resolutionStatus === "resolved" ? input.resolvedCitationReference ?? "" : "",
    resolvedReviewerIdentity: resolutionStatus === "resolved" ? input.resolvedReviewerIdentity ?? "" : "",
    resolvedReviewDate: resolutionStatus === "resolved" ? input.resolvedReviewDate ?? "" : "",
    resolutionStatus,
    failClosedReason,
    failsClosedOnNonActiveFramework: true,
    failsClosedOnUnpopulatedTopic: true,
    failsClosedOnUnreviewedTreatment: true,
    neverSilentlyDefaultsFramework: true,
    historicalResolutionByEffectiveDate: true,
    multiFrameworkPrimaryReferenceId: input.multiFrameworkPrimaryReferenceId ?? "",
    multiFrameworkSecondaryReferenceIds: getInputArray(input.multiFrameworkSecondaryReferenceIds),
    executable: false,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input, resolutionStatus, failClosedReason),
    treatmentResolutionComplete: input.treatmentResolutionComplete === true && resolutionStatus === "resolved",
  };

  return {
    treatmentResolution,
    skipped: false,
    warnings: treatmentResolution.warnings,
  };
}
