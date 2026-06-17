import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticOrganizationBaseContract,
  SyntheticPhase39RoleHandoffConsumptionContract,
} from "../contracts";
import { CAPACITY_ESTIMATE_ACCURACY_NOTE } from "./buildCapacity";
import type { SyntheticCapacity } from "./buildCapacity";

export interface BuildCapacityPackageInput extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  organizationalUnitId?: string;
  capacities?: SyntheticCapacity[];
  capacityReferenceIds?: string[];
  availableMemberReferenceIds?: string[];
  atCapacityMemberReferenceIds?: string[];
  overloadedMemberReferenceIds?: string[];
  bottleneckReferenceIds?: string[];
  capacitySnapshotHash?: string;
  containsPHI?: boolean;
  capacityPackageComplete?: boolean;
  capacityEstimateAccuracyNote?: string;
}

export interface SyntheticCapacityPackage extends SyntheticPhase39RoleHandoffConsumptionContract {
  capacityPackageId: string;
  capacityPackageKey: string;
  organizationalUnitId: string;
  capacityReferenceIds: string[];
  availableMemberReferenceIds: string[];
  atCapacityMemberReferenceIds: string[];
  overloadedMemberReferenceIds: string[];
  bottleneckReferenceIds: string[];
  capacitySnapshotHash: string;
  isObservationalOnly: true;
  neverReassignsWork: true;
  containsPHI: boolean;
  capacityPackageComplete: boolean;
  capacityEstimateAccuracyNote: string;
}

export interface BuildCapacityPackageResult {
  capacityPackage: SyntheticCapacityPackage | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined, capacities: SyntheticCapacity[]): boolean {
  if (capacities.some((capacity) => capacity.containsPHI === true)) {
    return true;
  }

  return inputContainsPHI ?? true;
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
    containsPHI: input.containsPHI ?? parent.containsPHI ?? true,
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

function getCapacityReferenceIds(input: BuildCapacityPackageInput): string[] {
  return getInputArray(input.capacityReferenceIds).length > 0
    ? getInputArray(input.capacityReferenceIds)
    : getInputArray(input.capacities).map((capacity) => capacity.capacityId);
}

function getAvailableMemberReferenceIds(input: BuildCapacityPackageInput): string[] {
  return getInputArray(input.availableMemberReferenceIds).length > 0
    ? getInputArray(input.availableMemberReferenceIds)
    : getInputArray(input.capacities)
        .filter((capacity) => capacity.capacityStatus === "available")
        .map((capacity) => capacity.workforceMemberId);
}

function getAtCapacityMemberReferenceIds(input: BuildCapacityPackageInput): string[] {
  return getInputArray(input.atCapacityMemberReferenceIds).length > 0
    ? getInputArray(input.atCapacityMemberReferenceIds)
    : getInputArray(input.capacities)
        .filter((capacity) => capacity.capacityStatus === "at_capacity")
        .map((capacity) => capacity.workforceMemberId);
}

function getOverloadedMemberReferenceIds(input: BuildCapacityPackageInput): string[] {
  return getInputArray(input.overloadedMemberReferenceIds).length > 0
    ? getInputArray(input.overloadedMemberReferenceIds)
    : getInputArray(input.capacities)
        .filter((capacity) => capacity.capacityStatus === "overloaded")
        .map((capacity) => capacity.workforceMemberId);
}

function getBottleneckReferenceIds(input: BuildCapacityPackageInput): string[] {
  return getInputArray(input.bottleneckReferenceIds).length > 0
    ? getInputArray(input.bottleneckReferenceIds)
    : getInputArray(input.capacities)
        .filter((capacity) => capacity.bottleneckIndicator === true)
        .map((capacity) => capacity.capacityId);
}

function getCapacitySnapshotHash(input: BuildCapacityPackageInput): string {
  return (
    input.capacitySnapshotHash ??
    stableSnapshotHash({
      organizationalUnitId: input.organizationalUnitId ?? "",
      capacityReferenceIds: getCapacityReferenceIds(input),
      availableMemberReferenceIds: getAvailableMemberReferenceIds(input),
      atCapacityMemberReferenceIds: getAtCapacityMemberReferenceIds(input),
      overloadedMemberReferenceIds: getOverloadedMemberReferenceIds(input),
      bottleneckReferenceIds: getBottleneckReferenceIds(input),
      boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
      boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    })
  );
}

function getCapacityEstimateAccuracyNote(input: BuildCapacityPackageInput): string {
  return input.capacityEstimateAccuracyNote ?? CAPACITY_ESTIMATE_ACCURACY_NOTE;
}

function collectMissingRequiredIdentifiers(input: BuildCapacityPackageInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.organizationalUnitId)) {
    missing.push("organizationalUnitId");
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

function buildCapacityPackageDerivationHash(input: BuildCapacityPackageInput): string {
  return stableSnapshotHash({
    organizationalUnitId: input.organizationalUnitId ?? "",
    capacityReferenceIds: getCapacityReferenceIds(input),
    availableMemberReferenceIds: getAvailableMemberReferenceIds(input),
    atCapacityMemberReferenceIds: getAtCapacityMemberReferenceIds(input),
    overloadedMemberReferenceIds: getOverloadedMemberReferenceIds(input),
    bottleneckReferenceIds: getBottleneckReferenceIds(input),
    capacitySnapshotHash: getCapacitySnapshotHash(input),
    isObservationalOnly: true,
    neverReassignsWork: true,
    containsPHI: getContainsPHI(input.containsPHI, getInputArray(input.capacities)),
    capacityPackageComplete: input.capacityPackageComplete === true,
    capacityEstimateAccuracyNote: getCapacityEstimateAccuracyNote(input),
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildCapacityPackage(input: BuildCapacityPackageInput): BuildCapacityPackageResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      capacityPackage: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const organizationalUnitId = input.organizationalUnitId as string;
  const containsPHI = getContainsPHI(input.containsPHI, getInputArray(input.capacities));
  const capacitySnapshotHash = getCapacitySnapshotHash(input);
  const derivationHash = buildCapacityPackageDerivationHash(input);
  const capacityPackageKey = stableSnapshotHash({
    organizationalUnitId,
    capacitySnapshotHash,
    containsPHI,
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash,
    derivationHash,
  });
  const capacityPackageId = stableSnapshotHash({
    capacityPackageKey,
    artifactType: "SyntheticCapacityPackage",
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
    capacityPackage: {
      ...base,
      capacityPackageId,
      capacityPackageKey,
      organizationalUnitId,
      capacityReferenceIds: getCapacityReferenceIds(input),
      availableMemberReferenceIds: getAvailableMemberReferenceIds(input),
      atCapacityMemberReferenceIds: getAtCapacityMemberReferenceIds(input),
      overloadedMemberReferenceIds: getOverloadedMemberReferenceIds(input),
      bottleneckReferenceIds: getBottleneckReferenceIds(input),
      capacitySnapshotHash,
      isObservationalOnly: true,
      neverReassignsWork: true,
      containsPHI,
      capacityPackageComplete: input.capacityPackageComplete === true,
      capacityEstimateAccuracyNote: getCapacityEstimateAccuracyNote(input),
      derivationHash,
    },
    skipped: false,
    warnings,
  };
}
