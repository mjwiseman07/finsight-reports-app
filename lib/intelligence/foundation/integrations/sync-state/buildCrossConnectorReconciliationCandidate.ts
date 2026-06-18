import { stableSnapshotHash } from "../../../core/hash";
import type { IntegrationBaseContract } from "../contracts";

export type CrossConnectorConflictType =
  | "duplicate_transaction"
  | "value_mismatch"
  | "timing_mismatch"
  | "other";

export interface BuildCrossConnectorReconciliationCandidateInput extends Partial<IntegrationBaseContract> {
  firmTenantId?: string;
  clientTenantId?: string;
  conflictingConnectorReferenceIds?: string[];
  conflictingRecordReferenceIds?: string[];
  conflictType?: CrossConnectorConflictType;
  conflictDescription?: string;
  requiresHumanReview?: true;
  neverSilentlyResolved?: true;
  systemNeverChoosesSourceAutonomously?: true;
  recommendationOnly?: true;
  reconciliationCandidateComplete?: boolean;
}

export interface SyntheticCrossConnectorReconciliationCandidate extends IntegrationBaseContract {
  reconciliationCandidateId: string;
  reconciliationCandidateKey: string;
  firmTenantId: string;
  clientTenantId: string;
  conflictingConnectorReferenceIds: string[];
  conflictingRecordReferenceIds: string[];
  conflictType: CrossConnectorConflictType;
  conflictDescription: string;
  requiresHumanReview: true;
  neverSilentlyResolved: true;
  systemNeverChoosesSourceAutonomously: true;
  recommendationOnly: true;
  reconciliationCandidateComplete: boolean;
}

export interface BuildCrossConnectorReconciliationCandidateResult {
  reconciliationCandidate: SyntheticCrossConnectorReconciliationCandidate | null;
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

function collectMissingRequiredIdentifiers(input: BuildCrossConnectorReconciliationCandidateInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.firmTenantId)) {
    missing.push("firmTenantId");
  }

  if (!hasValue(input.clientTenantId)) {
    missing.push("clientTenantId");
  }

  if (getInputArray(input.conflictingConnectorReferenceIds).length === 0) {
    missing.push("conflictingConnectorReferenceIds");
  }

  if (getInputArray(input.conflictingRecordReferenceIds).length === 0) {
    missing.push("conflictingRecordReferenceIds");
  }

  if (!input.conflictType) {
    missing.push("conflictType");
  }

  if (!hasValue(input.conflictDescription)) {
    missing.push("conflictDescription");
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

function buildReconciliationCandidateKey(input: BuildCrossConnectorReconciliationCandidateInput): string {
  return stableSnapshotHash({
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    conflictingConnectorReferenceIds: getInputArray(input.conflictingConnectorReferenceIds),
    conflictingRecordReferenceIds: getInputArray(input.conflictingRecordReferenceIds),
    conflictType: input.conflictType ?? "",
    conflictDescription: input.conflictDescription ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildReconciliationCandidateId(input: BuildCrossConnectorReconciliationCandidateInput): string {
  return `synthetic-cross-connector-reconciliation-candidate:${stableSnapshotHash({
    reconciliationCandidateKey: buildReconciliationCandidateKey(input),
    artifactType: "SyntheticCrossConnectorReconciliationCandidate",
  })}`;
}

function buildDerivationHash(input: BuildCrossConnectorReconciliationCandidateInput): string {
  return stableSnapshotHash({
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    conflictingConnectorReferenceIds: getInputArray(input.conflictingConnectorReferenceIds),
    conflictingRecordReferenceIds: getInputArray(input.conflictingRecordReferenceIds),
    conflictType: input.conflictType ?? "",
    conflictDescription: input.conflictDescription ?? "",
    requiresHumanReview: true,
    neverSilentlyResolved: true,
    systemNeverChoosesSourceAutonomously: true,
    recommendationOnly: true,
    containsPHI: getContainsPHI(input.containsPHI),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildCrossConnectorReconciliationCandidate(
  input: BuildCrossConnectorReconciliationCandidateInput,
): BuildCrossConnectorReconciliationCandidateResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      reconciliationCandidate: null,
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
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredConflictType = input.conflictType as CrossConnectorConflictType;
  const requiredConflictDescription = input.conflictDescription as string;

  const reconciliationCandidate: SyntheticCrossConnectorReconciliationCandidate = {
    ...sharedBase,
    reconciliationCandidateId: buildReconciliationCandidateId(input),
    reconciliationCandidateKey: buildReconciliationCandidateKey(input),
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    conflictingConnectorReferenceIds: getInputArray(input.conflictingConnectorReferenceIds),
    conflictingRecordReferenceIds: getInputArray(input.conflictingRecordReferenceIds),
    conflictType: requiredConflictType,
    conflictDescription: requiredConflictDescription,
    requiresHumanReview: true,
    neverSilentlyResolved: true,
    systemNeverChoosesSourceAutonomously: true,
    recommendationOnly: true,
    reconciliationCandidateComplete: input.reconciliationCandidateComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getInputArray(input.warnings),
  };

  return {
    reconciliationCandidate,
    skipped: false,
    warnings: reconciliationCandidate.warnings,
  };
}
