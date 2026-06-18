import { stableSnapshotHash } from "../../../core/hash";
import type { IntegrationBaseContract } from "../contracts";

export type WriteModeToggleDirection = "enable" | "disable";

export type WriteModeToggleStatus =
  | "pending_dual_confirmation"
  | "pending_cooling_off"
  | "enabled"
  | "disabled"
  | "rejected";

export interface BuildWriteModeToggleRequestInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  firmTenantId?: string;
  clientTenantId?: string;
  toggleDirection?: WriteModeToggleDirection;
  requestingHumanId?: string;
  dualConfirmationFirstApproverId?: string;
  dualConfirmationSecondApproverId?: string;
  dualConfirmationRequired?: true;
  enableRequiresDualConfirmation?: true;
  enableProducesPhase40PGovernanceEntry?: true;
  enableGovernanceEntryReferenceId?: string;
  enableRequiresCoolingOffPeriod?: true;
  coolingOffPeriodReference?: string;
  enableRequiresImpactReview?: true;
  disableTakesEffectImmediately?: true;
  toggleStatus?: WriteModeToggleStatus;
  writeModeToggleRequestComplete?: boolean;
}

export interface SyntheticWriteModeToggleRequest extends IntegrationBaseContract {
  writeModeToggleRequestId: string;
  writeModeToggleRequestKey: string;
  connectorId: string;
  firmTenantId: string;
  clientTenantId: string;
  toggleDirection: WriteModeToggleDirection;
  requestingHumanId: string;
  dualConfirmationFirstApproverId: string;
  dualConfirmationSecondApproverId: string;
  dualConfirmationRequired: true;
  enableRequiresDualConfirmation: true;
  enableProducesPhase40PGovernanceEntry: true;
  enableGovernanceEntryReferenceId: string;
  enableRequiresCoolingOffPeriod: true;
  coolingOffPeriodReference: string;
  enableRequiresImpactReview: true;
  disableTakesEffectImmediately: true;
  toggleStatus: WriteModeToggleStatus;
  writeModeToggleRequestComplete: boolean;
}

export interface BuildWriteModeToggleRequestResult {
  writeModeToggleRequest: SyntheticWriteModeToggleRequest | null;
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

function isEnableRequest(input: BuildWriteModeToggleRequestInput): boolean {
  return input.toggleDirection === "enable";
}

function getToggleStatus(input: BuildWriteModeToggleRequestInput): WriteModeToggleStatus {
  return input.toggleStatus ?? (isEnableRequest(input) ? "pending_cooling_off" : "disabled");
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

function collectMissingRequiredIdentifiers(input: BuildWriteModeToggleRequestInput): string[] {
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

  if (!input.toggleDirection) {
    missing.push("toggleDirection");
  }

  if (!hasValue(input.requestingHumanId)) {
    missing.push("requestingHumanId");
  }

  if (isEnableRequest(input) && !hasValue(input.dualConfirmationFirstApproverId)) {
    missing.push("dualConfirmationFirstApproverId");
  }

  if (isEnableRequest(input) && !hasValue(input.dualConfirmationSecondApproverId)) {
    missing.push("dualConfirmationSecondApproverId");
  }

  if (isEnableRequest(input) && !hasValue(input.enableGovernanceEntryReferenceId)) {
    missing.push("enableGovernanceEntryReferenceId");
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

function buildWriteModeToggleRequestKey(input: BuildWriteModeToggleRequestInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    toggleDirection: input.toggleDirection ?? "",
    requestingHumanId: input.requestingHumanId ?? "",
    dualConfirmationFirstApproverId: input.dualConfirmationFirstApproverId ?? "",
    dualConfirmationSecondApproverId: input.dualConfirmationSecondApproverId ?? "",
    enableGovernanceEntryReferenceId: input.enableGovernanceEntryReferenceId ?? "",
    coolingOffPeriodReference: input.coolingOffPeriodReference ?? "",
    toggleStatus: getToggleStatus(input),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildWriteModeToggleRequestId(input: BuildWriteModeToggleRequestInput): string {
  return `synthetic-write-mode-toggle-request:${stableSnapshotHash({
    writeModeToggleRequestKey: buildWriteModeToggleRequestKey(input),
    artifactType: "SyntheticWriteModeToggleRequest",
  })}`;
}

function buildDerivationHash(input: BuildWriteModeToggleRequestInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    toggleDirection: input.toggleDirection ?? "",
    requestingHumanId: input.requestingHumanId ?? "",
    dualConfirmationFirstApproverId: input.dualConfirmationFirstApproverId ?? "",
    dualConfirmationSecondApproverId: input.dualConfirmationSecondApproverId ?? "",
    dualConfirmationRequired: true,
    enableRequiresDualConfirmation: true,
    enableProducesPhase40PGovernanceEntry: true,
    enableGovernanceEntryReferenceId: input.enableGovernanceEntryReferenceId ?? "",
    enableRequiresCoolingOffPeriod: true,
    coolingOffPeriodReference: input.coolingOffPeriodReference ?? "",
    enableRequiresImpactReview: true,
    disableTakesEffectImmediately: true,
    toggleStatus: getToggleStatus(input),
    containsPHI: getContainsPHI(input.containsPHI),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

function getWarnings(input: BuildWriteModeToggleRequestInput): string[] {
  return [
    ...getInputArray(input.warnings),
    ...(isEnableRequest(input) ? ["enable toggle requires dual confirmation and Phase 40P governance entry"] : []),
    ...(isEnableRequest(input) && !hasValue(input.coolingOffPeriodReference)
      ? ["enable toggle declares cooling-off requirement without coolingOffPeriodReference"]
      : []),
  ];
}

export function buildWriteModeToggleRequest(
  input: BuildWriteModeToggleRequestInput,
): BuildWriteModeToggleRequestResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      writeModeToggleRequest: null,
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
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredToggleDirection = input.toggleDirection as WriteModeToggleDirection;
  const requiredRequestingHumanId = input.requestingHumanId as string;

  const writeModeToggleRequest: SyntheticWriteModeToggleRequest = {
    ...sharedBase,
    writeModeToggleRequestId: buildWriteModeToggleRequestId(input),
    writeModeToggleRequestKey: buildWriteModeToggleRequestKey(input),
    connectorId: requiredConnectorId,
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    toggleDirection: requiredToggleDirection,
    requestingHumanId: requiredRequestingHumanId,
    dualConfirmationFirstApproverId: input.dualConfirmationFirstApproverId ?? "",
    dualConfirmationSecondApproverId: input.dualConfirmationSecondApproverId ?? "",
    dualConfirmationRequired: true,
    enableRequiresDualConfirmation: true,
    enableProducesPhase40PGovernanceEntry: true,
    enableGovernanceEntryReferenceId: input.enableGovernanceEntryReferenceId ?? "",
    enableRequiresCoolingOffPeriod: true,
    coolingOffPeriodReference: input.coolingOffPeriodReference ?? "",
    enableRequiresImpactReview: true,
    disableTakesEffectImmediately: true,
    toggleStatus: getToggleStatus(input),
    writeModeToggleRequestComplete: input.writeModeToggleRequestComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    writeModeToggleRequest,
    skipped: false,
    warnings: writeModeToggleRequest.warnings,
  };
}
