import { stableSnapshotHash } from "../../../core/hash";
import type {
  CapacityContract,
  SyntheticOrganizationBaseContract,
  SyntheticOrganizationCapacityStatus,
  SyntheticPhase39RoleHandoffConsumptionContract,
} from "../contracts";

export const CAPACITY_ESTIMATE_ACCURACY_NOTE =
  "Capacity estimates are observational signals whose real-world accuracy is unverified until tested against real workloads.";

export interface BuildCapacityInput extends Partial<CapacityContract> {
  workforceMemberId?: string;
  assignedWorkReferenceIds?: string[];
  assignedWorkCount?: number;
  availableCapacityMetadata?: Record<string, unknown>;
  estimatedEffortMetadata?: Record<string, unknown>;
  workloadTrendMetadata?: Record<string, unknown>;
  capacityStatus?: SyntheticOrganizationCapacityStatus;
  bottleneckIndicator?: boolean;
  containsPHI?: boolean;
  capacityComplete?: boolean;
  capacityEstimateAccuracyNote?: string;
}

export interface SyntheticCapacity extends CapacityContract {
  assignedWorkCount: number;
  bottleneckIndicator: boolean;
  isObservationalOnly: true;
  containsPHI: boolean;
  capacityComplete: boolean;
  capacityEstimateAccuracyNote: string;
}

export interface BuildCapacityResult {
  capacity: SyntheticCapacity | null;
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

function getAssignedWorkCount(input: BuildCapacityInput): number {
  return input.assignedWorkCount ?? getInputArray(input.assignedWorkReferenceIds).length;
}

function getCapacityEstimateAccuracyNote(input: BuildCapacityInput): string {
  return input.capacityEstimateAccuracyNote ?? CAPACITY_ESTIMATE_ACCURACY_NOTE;
}

function getSharedBase(
  input: Partial<SyntheticOrganizationBaseContract>,
  parent: Partial<SyntheticOrganizationBaseContract>,
): SyntheticOrganizationBaseContract {
  return {
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? parent.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? parent.boundPhase38SnapshotHash ?? "",
    phase40StaleMarker: input.phase40StaleMarker ?? parent.phase40StaleMarker ?? "current",
    executable: false,
    executionReady: input.executionReady === true,
    scope: input.scope ?? parent.scope,
    customerIsolation: input.customerIsolation ?? parent.customerIsolation,
    firmIsolation: input.firmIsolation ?? parent.firmIsolation,
    clientIsolation: input.clientIsolation ?? parent.clientIsolation,
    containsPHI: getContainsPHI(input.containsPHI ?? parent.containsPHI),
    derivationLineageIds: getInputArray(input.derivationLineageIds ?? parent.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? parent.derivationMethod ?? "handoff_metadata_preservation",
    derivationHash: "",
    confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata ?? parent.confidenceFloorMetadata),
    sourceConfidenceReferenceIds: getInputArray(
      input.sourceConfidenceReferenceIds ?? parent.sourceConfidenceReferenceIds,
    ),
    evidenceReferenceIds: getInputArray(input.evidenceReferenceIds ?? parent.evidenceReferenceIds),
    lineageReferenceIds: getInputArray(input.lineageReferenceIds ?? parent.lineageReferenceIds),
    trustMetadata: getInputArray(input.trustMetadata ?? parent.trustMetadata),
    confidenceMetadata: getInputArray(input.confidenceMetadata ?? parent.confidenceMetadata),
    governanceMetadata: getInputArray(input.governanceMetadata ?? parent.governanceMetadata),
    warnings: getInputArray(input.warnings ?? parent.warnings),
    skippedIndexes: getInputArray(input.skippedIndexes ?? parent.skippedIndexes),
  } as SyntheticOrganizationBaseContract;
}

function getPhase39HandoffBase(
  input: Partial<SyntheticPhase39RoleHandoffConsumptionContract>,
  parent: Partial<SyntheticPhase39RoleHandoffConsumptionContract>,
): SyntheticPhase39RoleHandoffConsumptionContract {
  return {
    ...getSharedBase(input, parent),
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? parent.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(
      input.phase39RoleInstanceReferenceIds ?? parent.phase39RoleInstanceReferenceIds,
    ),
  };
}

function collectMissingRequiredIdentifiers(input: BuildCapacityInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.workforceMemberId)) {
    missing.push("workforceMemberId");
  }

  if (!hasValue(input.phase39RoleHandoffHandle)) {
    missing.push("phase39RoleHandoffHandle");
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

function buildCapacityDerivationHash(input: BuildCapacityInput): string {
  return stableSnapshotHash({
    workforceMemberId: input.workforceMemberId ?? "",
    assignedWorkReferenceIds: getInputArray(input.assignedWorkReferenceIds),
    assignedWorkCount: getAssignedWorkCount(input),
    availableCapacityMetadata: input.availableCapacityMetadata ?? {},
    estimatedEffortMetadata: input.estimatedEffortMetadata ?? {},
    workloadTrendMetadata: input.workloadTrendMetadata ?? {},
    capacityStatus: input.capacityStatus ?? "not_evaluated",
    bottleneckIndicator: input.bottleneckIndicator === true,
    isObservationalOnly: true,
    containsPHI: getContainsPHI(input.containsPHI),
    capacityComplete: input.capacityComplete === true,
    capacityEstimateAccuracyNote: getCapacityEstimateAccuracyNote(input),
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildCapacity(input: BuildCapacityInput): BuildCapacityResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      capacity: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const workforceMemberId = input.workforceMemberId as string;
  const containsPHI = getContainsPHI(input.containsPHI);
  const capacityStatus = input.capacityStatus ?? "not_evaluated";
  const derivationHash = buildCapacityDerivationHash(input);
  const capacityKey = stableSnapshotHash({
    workforceMemberId,
    capacityStatus,
    assignedWorkReferenceIds: getInputArray(input.assignedWorkReferenceIds),
    assignedWorkCount: getAssignedWorkCount(input),
    bottleneckIndicator: input.bottleneckIndicator === true,
    containsPHI,
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash,
    derivationHash,
  });
  const capacityId = stableSnapshotHash({
    capacityKey,
    artifactType: "SyntheticCapacity",
  });
  const base = getPhase39HandoffBase(
    {
      ...input,
      containsPHI,
      derivationHash,
    },
    {},
  );

  return {
    capacity: {
      ...base,
      capacityId,
      capacityKey,
      workforceMemberId,
      assignedWorkReferenceIds: getInputArray(input.assignedWorkReferenceIds),
      assignedWorkCount: getAssignedWorkCount(input),
      availableCapacityMetadata: input.availableCapacityMetadata ?? {},
      estimatedEffortMetadata: input.estimatedEffortMetadata ?? {},
      workloadTrendMetadata: input.workloadTrendMetadata ?? {},
      capacityStatus,
      bottleneckIndicator: input.bottleneckIndicator === true,
      isObservationalOnly: true,
      containsPHI,
      capacityComplete: input.capacityComplete === true,
      capacityEstimateAccuracyNote: getCapacityEstimateAccuracyNote(input),
      derivationHash,
    },
    skipped: false,
    warnings,
  };
}
