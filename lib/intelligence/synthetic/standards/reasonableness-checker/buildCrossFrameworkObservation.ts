import { stableSnapshotHash } from "../../../core/hash";
import type {
  StandardsBaseContract,
  StandardsMaterialityFlag,
  StandardsReportingFramework,
} from "../contracts";

type CrossFrameworkObservationBase = Omit<StandardsBaseContract, "reportingFramework"> & {
  reportingFrameworks: StandardsReportingFramework[];
};

export type ObservationStatus = "no_material_difference" | "flagged_for_review";

export interface BuildCrossFrameworkObservationInput extends Partial<CrossFrameworkObservationBase> {
  entityId?: string;
  topicIdentifier?: string;
  sourceTransactionReferenceId?: string;
  primaryFramework?: StandardsReportingFramework;
  secondaryFrameworks?: StandardsReportingFramework[];
  primaryTreatmentResolutionReferenceId?: string;
  secondaryTreatmentResolutionReferenceIds?: string[];
  treatmentDifferenceObserved?: boolean;
  differenceDescription?: string;
  differenceMaterialityFlag?: StandardsMaterialityFlag;
  phase40EscalationReferenceId?: string;
  crossFrameworkObservationComplete?: boolean;
}

export interface SyntheticCrossFrameworkObservation extends CrossFrameworkObservationBase {
  crossFrameworkObservationId: string;
  crossFrameworkObservationKey: string;
  entityId: string;
  topicIdentifier: string;
  sourceTransactionReferenceId: string;
  primaryFramework: StandardsReportingFramework;
  secondaryFrameworks: StandardsReportingFramework[];
  primaryTreatmentResolutionReferenceId: string;
  secondaryTreatmentResolutionReferenceIds: string[];
  treatmentDifferenceObserved: boolean;
  differenceDescription: string;
  differenceMaterialityFlag: StandardsMaterialityFlag;
  isObservationOnly: true;
  neverAssertsError: true;
  humansDecide: true;
  surfacedForHumanReview: boolean;
  materialDifferenceFeedsPhase40Escalation: true;
  phase40EscalationReferenceId: string;
  observationStatus: ObservationStatus;
  crossFrameworkObservationComplete: boolean;
}

export interface BuildCrossFrameworkObservationResult {
  crossFrameworkObservation: SyntheticCrossFrameworkObservation | null;
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

function getSecondaryFrameworks(
  input: BuildCrossFrameworkObservationInput,
): StandardsReportingFramework[] {
  return getInputArray(input.secondaryFrameworks);
}

function getReportingFrameworks(
  input: BuildCrossFrameworkObservationInput,
): StandardsReportingFramework[] {
  const explicitReportingFrameworks = getInputArray(input.reportingFrameworks);
  if (explicitReportingFrameworks.length > 0) {
    return explicitReportingFrameworks;
  }

  const primaryFramework = input.primaryFramework;
  if (!primaryFramework) {
    return [];
  }

  return [primaryFramework, ...getSecondaryFrameworks(input)];
}

function getTreatmentDifferenceObserved(input: BuildCrossFrameworkObservationInput): boolean {
  return input.treatmentDifferenceObserved === true;
}

function getDifferenceMaterialityFlag(
  input: BuildCrossFrameworkObservationInput,
): StandardsMaterialityFlag {
  return input.differenceMaterialityFlag ?? "low";
}

function getObservationStatus(input: BuildCrossFrameworkObservationInput): ObservationStatus {
  if (!getTreatmentDifferenceObserved(input)) {
    return "no_material_difference";
  }

  if (getDifferenceMaterialityFlag(input) === "high") {
    return "flagged_for_review";
  }

  return "no_material_difference";
}

function getSurfacedForHumanReview(observationStatus: ObservationStatus): boolean {
  return observationStatus === "flagged_for_review";
}

function getSharedBase(input: Partial<CrossFrameworkObservationBase>): CrossFrameworkObservationBase {
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
    reportingFrameworks: getInputArray(input.reportingFrameworks),
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
  } as CrossFrameworkObservationBase;
}

function collectMissingRequiredIdentifiers(input: BuildCrossFrameworkObservationInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.entityId)) {
    missing.push("entityId");
  }

  if (!hasValue(input.topicIdentifier)) {
    missing.push("topicIdentifier");
  }

  if (!input.primaryFramework) {
    missing.push("primaryFramework");
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

function buildCrossFrameworkObservationKey(input: BuildCrossFrameworkObservationInput): string {
  const observationStatus = getObservationStatus(input);

  return stableSnapshotHash({
    entityId: input.entityId ?? "",
    topicIdentifier: input.topicIdentifier ?? "",
    sourceTransactionReferenceId: input.sourceTransactionReferenceId ?? "",
    primaryFramework: input.primaryFramework ?? "",
    secondaryFrameworks: getSecondaryFrameworks(input),
    reportingFrameworks: getReportingFrameworks(input),
    primaryTreatmentResolutionReferenceId: input.primaryTreatmentResolutionReferenceId ?? "",
    secondaryTreatmentResolutionReferenceIds: getInputArray(
      input.secondaryTreatmentResolutionReferenceIds,
    ),
    treatmentDifferenceObserved: getTreatmentDifferenceObserved(input),
    differenceMaterialityFlag: getDifferenceMaterialityFlag(input),
    observationStatus,
    phase40EscalationReferenceId: input.phase40EscalationReferenceId ?? "",
  });
}

function buildCrossFrameworkObservationId(input: BuildCrossFrameworkObservationInput): string {
  return `synthetic-cross-framework-observation:${stableSnapshotHash({
    crossFrameworkObservationKey: buildCrossFrameworkObservationKey(input),
    artifactType: "SyntheticCrossFrameworkObservation",
  })}`;
}

function buildDerivationHash(input: BuildCrossFrameworkObservationInput): string {
  return stableSnapshotHash({
    crossFrameworkObservationKey: buildCrossFrameworkObservationKey(input),
    isObservationOnly: true,
    neverAssertsError: true,
    humansDecide: true,
    materialDifferenceFeedsPhase40Escalation: true,
    observationStatus: getObservationStatus(input),
    surfacedForHumanReview: getSurfacedForHumanReview(getObservationStatus(input)),
    treatmentDifferenceObserved: getTreatmentDifferenceObserved(input),
  });
}

function getWarnings(
  input: BuildCrossFrameworkObservationInput,
  observationStatus: ObservationStatus,
): string[] {
  const treatmentDifferenceObserved = getTreatmentDifferenceObserved(input);
  const differenceMaterialityFlag = getDifferenceMaterialityFlag(input);

  return [
    ...getInputArray(input.warnings),
    ...(treatmentDifferenceObserved && !hasValue(input.differenceDescription)
      ? ["treatment difference observed; differenceDescription should record the observation without asserting error"]
      : []),
    ...(treatmentDifferenceObserved &&
    differenceMaterialityFlag !== "high" &&
    observationStatus === "no_material_difference"
      ? ["treatment difference observed at non-high materiality; observation recorded without escalation flag"]
      : []),
    ...(observationStatus === "flagged_for_review" && !hasValue(input.phase40EscalationReferenceId)
      ? ["material difference should reference Phase 40F escalation via phase40EscalationReferenceId"]
      : []),
    ...(!hasValue(input.primaryTreatmentResolutionReferenceId)
      ? ["observation should reference the 41.5D primary treatment resolution"]
      : []),
    ...(getSecondaryFrameworks(input).length > 0 &&
    getInputArray(input.secondaryTreatmentResolutionReferenceIds).length === 0
      ? ["observation should reference secondary treatment resolutions from resolveMultiFramework outputs"]
      : []),
    "metadata-only cross-framework observation contract; checker observes and flags only — humans decide; live comparison is deferred to real-data validation",
  ];
}

export function buildCrossFrameworkObservation(
  input: BuildCrossFrameworkObservationInput,
): BuildCrossFrameworkObservationResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      crossFrameworkObservation: null,
      skipped: true,
      warnings: [
        `missing required cross-framework observation identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const requiredEntityId = input.entityId as string;
  const requiredTopicIdentifier = input.topicIdentifier as string;
  const requiredPrimaryFramework = input.primaryFramework as StandardsReportingFramework;
  const reportingFrameworks = getReportingFrameworks(input);
  const observationStatus = getObservationStatus(input);
  const surfacedForHumanReview = getSurfacedForHumanReview(observationStatus);
  const treatmentDifferenceObserved = getTreatmentDifferenceObserved(input);
  const base = getSharedBase({
    ...input,
    reportingFrameworks,
  });
  const crossFrameworkObservation: SyntheticCrossFrameworkObservation = {
    ...base,
    crossFrameworkObservationId: buildCrossFrameworkObservationId(input),
    crossFrameworkObservationKey: buildCrossFrameworkObservationKey(input),
    entityId: requiredEntityId,
    topicIdentifier: requiredTopicIdentifier,
    sourceTransactionReferenceId: input.sourceTransactionReferenceId ?? "",
    primaryFramework: requiredPrimaryFramework,
    secondaryFrameworks: getSecondaryFrameworks(input),
    primaryTreatmentResolutionReferenceId: input.primaryTreatmentResolutionReferenceId ?? "",
    secondaryTreatmentResolutionReferenceIds: getInputArray(
      input.secondaryTreatmentResolutionReferenceIds,
    ),
    treatmentDifferenceObserved,
    differenceDescription: input.differenceDescription ?? "",
    differenceMaterialityFlag: getDifferenceMaterialityFlag(input),
    isObservationOnly: true,
    neverAssertsError: true,
    humansDecide: true,
    surfacedForHumanReview,
    materialDifferenceFeedsPhase40Escalation: true,
    phase40EscalationReferenceId: input.phase40EscalationReferenceId ?? "",
    observationStatus,
    reportingFrameworks,
    executable: false,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input, observationStatus),
    crossFrameworkObservationComplete:
      input.crossFrameworkObservationComplete === true &&
      (observationStatus === "no_material_difference" ||
        (observationStatus === "flagged_for_review" &&
          hasValue(input.phase40EscalationReferenceId))),
  };

  return {
    crossFrameworkObservation,
    skipped: false,
    warnings: crossFrameworkObservation.warnings,
  };
}
