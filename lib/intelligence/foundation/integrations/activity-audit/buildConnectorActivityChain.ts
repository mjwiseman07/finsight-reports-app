import { stableSnapshotHash } from "../../../core/hash";
import type { IntegrationBaseContract } from "../contracts";
import type { SyntheticConnectorActivityEntry } from "./buildConnectorActivityEntry";

export interface BuildConnectorActivityChainInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  firmTenantId?: string;
  clientTenantId?: string;
  phase40OrganizationalHandoffHandle?: string;
  phase40HandoffReferenceIds?: string[];
  connectorActivityEntries?: SyntheticConnectorActivityEntry[];
  activityEntryReferenceIds?: string[];
  chainSequenceNumbers?: Record<string, number>;
  chainHeadReferenceId?: string;
  chainTailReferenceId?: string;
  connectorActivityChainComplete?: boolean;
}

export interface SyntheticConnectorActivityChain extends IntegrationBaseContract {
  connectorActivityChainId: string;
  connectorActivityChainKey: string;
  connectorId: string;
  firmTenantId: string;
  clientTenantId: string;
  phase40OrganizationalHandoffHandle: string;
  phase40HandoffReferenceIds: string[];
  activityEntryReferenceIds: string[];
  chainSequenceNumbers: Record<string, number>;
  chainHeadReferenceId: string;
  chainTailReferenceId: string;
  appendOnly: true;
  immutableRecord: true;
  neverEditedOrDeleted: true;
  connectorActivityChainComplete: boolean;
}

export interface BuildConnectorActivityChainResult {
  connectorActivityChain: SyntheticConnectorActivityChain | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getInputRecord<T>(value: Record<string, T> | undefined): Record<string, T> {
  return value ?? {};
}

function getContainsPHI(input: BuildConnectorActivityChainInput): boolean {
  if (getInputArray(input.connectorActivityEntries).some((entry) => entry.containsPHI === true)) {
    return true;
  }

  return input.containsPHI ?? true;
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
    containsPHI: getContainsPHI(input as BuildConnectorActivityChainInput),
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

function getActivityEntryReferenceIds(input: BuildConnectorActivityChainInput): string[] {
  return getInputArray(input.activityEntryReferenceIds).length > 0
    ? getInputArray(input.activityEntryReferenceIds)
    : getInputArray(input.connectorActivityEntries).map((entry) => entry.connectorActivityEntryId);
}

function getChainSequenceNumbers(input: BuildConnectorActivityChainInput): Record<string, number> {
  const inputSequenceNumbers = getInputRecord(input.chainSequenceNumbers);
  const activityEntryReferenceIds = getActivityEntryReferenceIds(input);

  if (Object.keys(inputSequenceNumbers).length > 0) {
    return inputSequenceNumbers;
  }

  return activityEntryReferenceIds.reduce<Record<string, number>>((sequenceNumbers, referenceId, index) => {
    sequenceNumbers[referenceId] = index + 1;
    return sequenceNumbers;
  }, {});
}

function getChainHeadReferenceId(input: BuildConnectorActivityChainInput): string {
  return input.chainHeadReferenceId ?? getActivityEntryReferenceIds(input)[0] ?? "";
}

function getChainTailReferenceId(input: BuildConnectorActivityChainInput): string {
  const activityEntryReferenceIds = getActivityEntryReferenceIds(input);

  return input.chainTailReferenceId ?? activityEntryReferenceIds[activityEntryReferenceIds.length - 1] ?? "";
}

function collectMissingRequiredIdentifiers(input: BuildConnectorActivityChainInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.connectorId)) {
    missing.push("connectorId");
  }

  if (!hasValue(input.firmTenantId)) {
    missing.push("firmTenantId");
  }

  if (!hasValue(input.clientTenantId)) {
    missing.push("clientTenantId");
  }

  if (getActivityEntryReferenceIds(input).length === 0) {
    missing.push("activityEntryReferenceIds");
  }

  if (!hasValue(input.phase40OrganizationalHandoffHandle)) {
    missing.push("phase40OrganizationalHandoffHandle");
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

function buildConnectorActivityChainKey(input: BuildConnectorActivityChainInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    activityEntryReferenceIds: getActivityEntryReferenceIds(input),
    chainSequenceNumbers: getChainSequenceNumbers(input),
    chainHeadReferenceId: getChainHeadReferenceId(input),
    chainTailReferenceId: getChainTailReferenceId(input),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildConnectorActivityChainId(input: BuildConnectorActivityChainInput): string {
  return `synthetic-connector-activity-chain:${stableSnapshotHash({
    connectorActivityChainKey: buildConnectorActivityChainKey(input),
    artifactType: "SyntheticConnectorActivityChain",
  })}`;
}

function buildDerivationHash(input: BuildConnectorActivityChainInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    activityEntryReferenceIds: getActivityEntryReferenceIds(input),
    chainSequenceNumbers: getChainSequenceNumbers(input),
    chainHeadReferenceId: getChainHeadReferenceId(input),
    chainTailReferenceId: getChainTailReferenceId(input),
    appendOnly: true,
    immutableRecord: true,
    neverEditedOrDeleted: true,
    containsPHI: getContainsPHI(input),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildConnectorActivityChain(
  input: BuildConnectorActivityChainInput,
): BuildConnectorActivityChainResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      connectorActivityChain: null,
      skipped: true,
      warnings: [
        ...getInputArray(input.warnings),
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const sharedBase = getSharedBase({
    ...input,
    containsPHI: getContainsPHI(input),
  });
  const requiredConnectorId = input.connectorId as string;
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredPhase40OrganizationalHandoffHandle = input.phase40OrganizationalHandoffHandle as string;

  const connectorActivityChain: SyntheticConnectorActivityChain = {
    ...sharedBase,
    connectorActivityChainId: buildConnectorActivityChainId(input),
    connectorActivityChainKey: buildConnectorActivityChainKey(input),
    connectorId: requiredConnectorId,
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    phase40OrganizationalHandoffHandle: requiredPhase40OrganizationalHandoffHandle,
    phase40HandoffReferenceIds: getInputArray(input.phase40HandoffReferenceIds),
    activityEntryReferenceIds: getActivityEntryReferenceIds(input),
    chainSequenceNumbers: getChainSequenceNumbers(input),
    chainHeadReferenceId: getChainHeadReferenceId(input),
    chainTailReferenceId: getChainTailReferenceId(input),
    appendOnly: true,
    immutableRecord: true,
    neverEditedOrDeleted: true,
    connectorActivityChainComplete: input.connectorActivityChainComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getInputArray(input.warnings),
  };

  return {
    connectorActivityChain,
    skipped: false,
    warnings: connectorActivityChain.warnings,
  };
}
