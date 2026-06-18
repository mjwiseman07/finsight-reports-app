import { stableSnapshotHash } from "../../../core/hash";
import type { IntegrationBaseContract, IntegrationConnectorKind } from "../contracts";

export type ConnectorApiVersionLifecycle = "current" | "deprecated" | "sunset";

export interface BuildConnectorVersionInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  connectorKind?: IntegrationConnectorKind;
  apiVersion?: string;
  apiVersionLifecycle?: ConnectorApiVersionLifecycle;
  apiVersionMigrationRequired?: boolean;
  lastUpstreamApiChangeReviewed?: string;
  humanReviewRecorded?: boolean;
  deprecatedWithoutReviewFlag?: boolean;
  flaggedForHumanReview?: boolean;
  upstreamChangeRecordedForReview?: true;
  mirrorsStandardsCurrencyDiscipline?: true;
  connectorVersionComplete?: boolean;
}

export interface SyntheticConnectorVersion extends IntegrationBaseContract {
  connectorVersionId: string;
  connectorVersionKey: string;
  connectorId: string;
  connectorKind: IntegrationConnectorKind;
  apiVersion: string;
  apiVersionLifecycle: ConnectorApiVersionLifecycle;
  apiVersionMigrationRequired: boolean;
  lastUpstreamApiChangeReviewed: string;
  humanReviewRecorded: boolean;
  deprecatedWithoutReviewFlag: boolean;
  flaggedForHumanReview: boolean;
  upstreamChangeRecordedForReview: true;
  mirrorsStandardsCurrencyDiscipline: true;
  connectorVersionComplete: boolean;
}

export interface BuildConnectorVersionResult {
  connectorVersion: SyntheticConnectorVersion | null;
  skipped: boolean;
  warnings: string[];
}

// Contract-layer version metadata only. Live upstream version detection and migration
// handling are validated later in live-execution testing and recorded on the real-data test register.
function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function getSharedBase(input: Partial<IntegrationBaseContract>): IntegrationBaseContract {
  return {
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    phase405StaleMarker: input.phase405StaleMarker ?? "current",
    executable: false,
    executionReady: input.executionReady === true,
    scope: input.scope,
    customerIsolation: input.customerIsolation,
    firmIsolation: input.firmIsolation,
    clientIsolation: input.clientIsolation,
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
  } as IntegrationBaseContract;
}

function isDeprecatedOrSunset(input: BuildConnectorVersionInput): boolean {
  return input.apiVersionLifecycle === "deprecated" || input.apiVersionLifecycle === "sunset";
}

function getDeprecatedWithoutReviewFlag(input: BuildConnectorVersionInput): boolean {
  return input.deprecatedWithoutReviewFlag === true || (isDeprecatedOrSunset(input) && input.humanReviewRecorded !== true);
}

function getFlaggedForHumanReview(input: BuildConnectorVersionInput): boolean {
  return (
    input.flaggedForHumanReview === true ||
    getDeprecatedWithoutReviewFlag(input) ||
    input.apiVersionMigrationRequired === true
  );
}

function collectMissingRequiredIdentifiers(input: BuildConnectorVersionInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.connectorId)) {
    missing.push("connectorId");
  }

  if (!input.connectorKind) {
    missing.push("connectorKind");
  }

  if (!hasValue(input.apiVersion)) {
    missing.push("apiVersion");
  }

  if (!input.apiVersionLifecycle) {
    missing.push("apiVersionLifecycle");
  }

  if (!hasValue(input.lastUpstreamApiChangeReviewed)) {
    missing.push("lastUpstreamApiChangeReviewed");
  }

  if (!hasValue(input.boundPhase40SnapshotHash)) {
    missing.push("boundPhase40SnapshotHash");
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

function buildConnectorVersionKey(input: BuildConnectorVersionInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: input.connectorKind ?? "",
    apiVersion: input.apiVersion ?? "",
    apiVersionLifecycle: input.apiVersionLifecycle ?? "",
    apiVersionMigrationRequired: input.apiVersionMigrationRequired === true,
    lastUpstreamApiChangeReviewed: input.lastUpstreamApiChangeReviewed ?? "",
    humanReviewRecorded: input.humanReviewRecorded === true,
    deprecatedWithoutReviewFlag: getDeprecatedWithoutReviewFlag(input),
    flaggedForHumanReview: getFlaggedForHumanReview(input),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildConnectorVersionId(input: BuildConnectorVersionInput): string {
  return `synthetic-connector-version:${stableSnapshotHash({
    connectorVersionKey: buildConnectorVersionKey(input),
    artifactType: "SyntheticConnectorVersion",
  })}`;
}

function buildDerivationHash(input: BuildConnectorVersionInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: input.connectorKind ?? "",
    apiVersion: input.apiVersion ?? "",
    apiVersionLifecycle: input.apiVersionLifecycle ?? "",
    apiVersionMigrationRequired: input.apiVersionMigrationRequired === true,
    lastUpstreamApiChangeReviewed: input.lastUpstreamApiChangeReviewed ?? "",
    humanReviewRecorded: input.humanReviewRecorded === true,
    deprecatedWithoutReviewFlag: getDeprecatedWithoutReviewFlag(input),
    flaggedForHumanReview: getFlaggedForHumanReview(input),
    upstreamChangeRecordedForReview: true,
    mirrorsStandardsCurrencyDiscipline: true,
    containsPHI: getContainsPHI(input.containsPHI),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

function getWarnings(input: BuildConnectorVersionInput): string[] {
  return [
    ...getInputArray(input.warnings),
    ...(getDeprecatedWithoutReviewFlag(input)
      ? ["deprecated or sunset apiVersionLifecycle lacks recorded human review"]
      : []),
    ...(input.apiVersionMigrationRequired === true ? ["apiVersionMigrationRequired requires human review"] : []),
  ];
}

export function buildConnectorVersion(input: BuildConnectorVersionInput): BuildConnectorVersionResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      connectorVersion: null,
      skipped: true,
      warnings: [
        ...getInputArray(input.warnings),
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const sharedBase = getSharedBase({
    ...input,
    containsPHI: getContainsPHI(input.containsPHI),
  });
  const requiredConnectorId = input.connectorId as string;
  const requiredConnectorKind = input.connectorKind as IntegrationConnectorKind;
  const requiredApiVersion = input.apiVersion as string;
  const requiredApiVersionLifecycle = input.apiVersionLifecycle as ConnectorApiVersionLifecycle;
  const requiredLastUpstreamApiChangeReviewed = input.lastUpstreamApiChangeReviewed as string;

  const connectorVersion: SyntheticConnectorVersion = {
    ...sharedBase,
    connectorVersionId: buildConnectorVersionId(input),
    connectorVersionKey: buildConnectorVersionKey(input),
    connectorId: requiredConnectorId,
    connectorKind: requiredConnectorKind,
    apiVersion: requiredApiVersion,
    apiVersionLifecycle: requiredApiVersionLifecycle,
    apiVersionMigrationRequired: input.apiVersionMigrationRequired === true,
    lastUpstreamApiChangeReviewed: requiredLastUpstreamApiChangeReviewed,
    humanReviewRecorded: input.humanReviewRecorded === true,
    deprecatedWithoutReviewFlag: getDeprecatedWithoutReviewFlag(input),
    flaggedForHumanReview: getFlaggedForHumanReview(input),
    upstreamChangeRecordedForReview: true,
    mirrorsStandardsCurrencyDiscipline: true,
    connectorVersionComplete: input.connectorVersionComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    connectorVersion,
    skipped: false,
    warnings: connectorVersion.warnings,
  };
}
