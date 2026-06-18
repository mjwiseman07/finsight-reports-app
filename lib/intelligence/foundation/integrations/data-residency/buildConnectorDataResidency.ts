import { stableSnapshotHash } from "../../../core/hash";
import type { IntegrationBaseContract, IntegrationConnectorKind } from "../contracts";

export interface BuildConnectorDataResidencyInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  connectorKind?: IntegrationConnectorKind;
  firmTenantId?: string;
  clientTenantId?: string;
  supportedRegions?: string[];
  defaultRegion?: string;
  regionPinningSupported?: boolean;
  entityRequiredRegion?: string;
  requiredRegionSatisfied?: boolean;
  selectableForEntity?: boolean;
  failsClosedWhenRegionUnsatisfiable?: true;
  notSelectableWhenRegionUnsatisfiable?: true;
  requiredRegionSourcedFromEntityConfig?: true;
  integratesWithPhase42_5DataResidency?: true;
  connectorDataResidencyComplete?: boolean;
}

export interface SyntheticConnectorDataResidency extends IntegrationBaseContract {
  connectorDataResidencyId: string;
  connectorDataResidencyKey: string;
  connectorId: string;
  connectorKind: IntegrationConnectorKind;
  firmTenantId: string;
  clientTenantId: string;
  supportedRegions: string[];
  defaultRegion: string;
  regionPinningSupported: boolean;
  entityRequiredRegion: string;
  requiredRegionSatisfied: boolean;
  selectableForEntity: boolean;
  failsClosedWhenRegionUnsatisfiable: true;
  notSelectableWhenRegionUnsatisfiable: true;
  requiredRegionSourcedFromEntityConfig: true;
  integratesWithPhase42_5DataResidency: true;
  connectorDataResidencyComplete: boolean;
}

export interface BuildConnectorDataResidencyResult {
  connectorDataResidency: SyntheticConnectorDataResidency | null;
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

function getRequiredRegionSatisfied(input: BuildConnectorDataResidencyInput): boolean {
  if (!hasValue(input.entityRequiredRegion)) {
    return input.requiredRegionSatisfied === true;
  }

  return getInputArray(input.supportedRegions).includes(input.entityRequiredRegion as string);
}

function getSelectableForEntity(input: BuildConnectorDataResidencyInput): boolean {
  return getRequiredRegionSatisfied(input) === true;
}

function collectMissingRequiredIdentifiers(input: BuildConnectorDataResidencyInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.connectorId)) {
    missing.push("connectorId");
  }

  if (!input.connectorKind) {
    missing.push("connectorKind");
  }

  if (!hasValue(input.firmTenantId)) {
    missing.push("firmTenantId");
  }

  if (!hasValue(input.clientTenantId)) {
    missing.push("clientTenantId");
  }

  if (getInputArray(input.supportedRegions).length === 0) {
    missing.push("supportedRegions");
  }

  if (!hasValue(input.defaultRegion)) {
    missing.push("defaultRegion");
  }

  if (!hasValue(input.entityRequiredRegion)) {
    missing.push("entityRequiredRegion");
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

function buildConnectorDataResidencyKey(input: BuildConnectorDataResidencyInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: input.connectorKind ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    supportedRegions: getInputArray(input.supportedRegions),
    defaultRegion: input.defaultRegion ?? "",
    regionPinningSupported: input.regionPinningSupported === true,
    entityRequiredRegion: input.entityRequiredRegion ?? "",
    requiredRegionSatisfied: getRequiredRegionSatisfied(input),
    selectableForEntity: getSelectableForEntity(input),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildConnectorDataResidencyId(input: BuildConnectorDataResidencyInput): string {
  return `synthetic-connector-data-residency:${stableSnapshotHash({
    connectorDataResidencyKey: buildConnectorDataResidencyKey(input),
    artifactType: "SyntheticConnectorDataResidency",
  })}`;
}

function buildDerivationHash(input: BuildConnectorDataResidencyInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: input.connectorKind ?? "",
    supportedRegions: getInputArray(input.supportedRegions),
    defaultRegion: input.defaultRegion ?? "",
    regionPinningSupported: input.regionPinningSupported === true,
    entityRequiredRegion: input.entityRequiredRegion ?? "",
    requiredRegionSatisfied: getRequiredRegionSatisfied(input),
    selectableForEntity: getSelectableForEntity(input),
    failsClosedWhenRegionUnsatisfiable: true,
    notSelectableWhenRegionUnsatisfiable: true,
    requiredRegionSourcedFromEntityConfig: true,
    integratesWithPhase42_5DataResidency: true,
    containsPHI: getContainsPHI(input.containsPHI),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

function getWarnings(input: BuildConnectorDataResidencyInput): string[] {
  return [
    ...getInputArray(input.warnings),
    ...(getRequiredRegionSatisfied(input)
      ? []
      : [
          `entityRequiredRegion ${input.entityRequiredRegion ?? ""} is not satisfiable by supportedRegions`,
        ]),
  ];
}

export function buildConnectorDataResidency(
  input: BuildConnectorDataResidencyInput,
): BuildConnectorDataResidencyResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      connectorDataResidency: null,
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
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredDefaultRegion = input.defaultRegion as string;
  const requiredEntityRequiredRegion = input.entityRequiredRegion as string;

  const connectorDataResidency: SyntheticConnectorDataResidency = {
    ...sharedBase,
    connectorDataResidencyId: buildConnectorDataResidencyId(input),
    connectorDataResidencyKey: buildConnectorDataResidencyKey(input),
    connectorId: requiredConnectorId,
    connectorKind: requiredConnectorKind,
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    supportedRegions: getInputArray(input.supportedRegions),
    defaultRegion: requiredDefaultRegion,
    regionPinningSupported: input.regionPinningSupported === true,
    entityRequiredRegion: requiredEntityRequiredRegion,
    requiredRegionSatisfied: getRequiredRegionSatisfied(input),
    selectableForEntity: getSelectableForEntity(input),
    failsClosedWhenRegionUnsatisfiable: true,
    notSelectableWhenRegionUnsatisfiable: true,
    requiredRegionSourcedFromEntityConfig: true,
    integratesWithPhase42_5DataResidency: true,
    connectorDataResidencyComplete: input.connectorDataResidencyComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    connectorDataResidency,
    skipped: false,
    warnings: connectorDataResidency.warnings,
  };
}
