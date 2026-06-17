import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticOrganizationBaseContract,
  SyntheticPhase39RoleHandoffConsumptionContract,
} from "../contracts";
import type { SyntheticAssignmentCandidate } from "./buildAssignmentCandidate";

export interface BuildWorkAllocationPackageInput extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  organizationalUnitId?: string;
  workItemReferenceIds?: string[];
  assignmentCandidates?: SyntheticAssignmentCandidate[];
  assignmentCandidateReferenceIds?: string[];
  consumedCapacityPackageReferenceId?: string;
  consumedCapacitySnapshotHash?: string;
  latestCapacitySnapshotHash?: string;
  capacityConflictsPresent?: boolean;
  inputSnapshotHash?: string;
  isStale?: boolean;
  containsPHI?: boolean;
  workAllocationPackageComplete?: boolean;
}

export interface SyntheticWorkAllocationPackage extends SyntheticPhase39RoleHandoffConsumptionContract {
  workAllocationPackageId: string;
  workAllocationPackageKey: string;
  organizationalUnitId: string;
  workItemReferenceIds: string[];
  assignmentCandidateReferenceIds: string[];
  consumedCapacityPackageReferenceId: string;
  consumedCapacitySnapshotHash: string;
  capacityConflictsPresent: boolean;
  inputSnapshotHash: string;
  isStale: boolean;
  isRecommendationOnly: true;
  noAutomaticAssignment: true;
  humanApprovesEveryAllocation: true;
  containsPHI: boolean;
  workAllocationPackageComplete: boolean;
}

export interface BuildWorkAllocationPackageResult {
  workAllocationPackage: SyntheticWorkAllocationPackage | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined, candidates: SyntheticAssignmentCandidate[]): boolean {
  if (candidates.some((candidate) => candidate.containsPHI === true)) {
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

function getAssignmentCandidateReferenceIds(input: BuildWorkAllocationPackageInput): string[] {
  return getInputArray(input.assignmentCandidateReferenceIds).length > 0
    ? getInputArray(input.assignmentCandidateReferenceIds)
    : getInputArray(input.assignmentCandidates).map((candidate) => candidate.assignmentCandidateId);
}

function getCapacityConflictsPresent(input: BuildWorkAllocationPackageInput): boolean {
  return (
    input.capacityConflictsPresent === true ||
    getInputArray(input.assignmentCandidates).some((candidate) => candidate.capacityConflictFlag === true)
  );
}

function getInputSnapshotHash(input: BuildWorkAllocationPackageInput): string {
  return (
    input.inputSnapshotHash ??
    stableSnapshotHash({
      organizationalUnitId: input.organizationalUnitId ?? "",
      workItemReferenceIds: getInputArray(input.workItemReferenceIds),
      assignmentCandidateReferenceIds: getAssignmentCandidateReferenceIds(input),
      consumedCapacityPackageReferenceId: input.consumedCapacityPackageReferenceId ?? "",
      consumedCapacitySnapshotHash: input.consumedCapacitySnapshotHash ?? "",
      boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
      boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    })
  );
}

function getIsStale(input: BuildWorkAllocationPackageInput): boolean {
  return (
    input.isStale === true ||
    (hasValue(input.latestCapacitySnapshotHash) &&
      input.latestCapacitySnapshotHash !== (input.consumedCapacitySnapshotHash ?? ""))
  );
}

function collectMissingRequiredIdentifiers(input: BuildWorkAllocationPackageInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.organizationalUnitId)) {
    missing.push("organizationalUnitId");
  }

  if (!hasValue(input.consumedCapacityPackageReferenceId)) {
    missing.push("consumedCapacityPackageReferenceId");
  }

  if (!hasValue(input.consumedCapacitySnapshotHash)) {
    missing.push("consumedCapacitySnapshotHash");
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

function buildWorkAllocationPackageDerivationHash(input: BuildWorkAllocationPackageInput): string {
  return stableSnapshotHash({
    organizationalUnitId: input.organizationalUnitId ?? "",
    workItemReferenceIds: getInputArray(input.workItemReferenceIds),
    assignmentCandidateReferenceIds: getAssignmentCandidateReferenceIds(input),
    consumedCapacityPackageReferenceId: input.consumedCapacityPackageReferenceId ?? "",
    consumedCapacitySnapshotHash: input.consumedCapacitySnapshotHash ?? "",
    capacityConflictsPresent: getCapacityConflictsPresent(input),
    inputSnapshotHash: getInputSnapshotHash(input),
    isStale: getIsStale(input),
    isRecommendationOnly: true,
    noAutomaticAssignment: true,
    humanApprovesEveryAllocation: true,
    containsPHI: getContainsPHI(input.containsPHI, getInputArray(input.assignmentCandidates)),
    workAllocationPackageComplete: input.workAllocationPackageComplete === true,
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildWorkAllocationPackage(
  input: BuildWorkAllocationPackageInput,
): BuildWorkAllocationPackageResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      workAllocationPackage: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const organizationalUnitId = input.organizationalUnitId as string;
  const containsPHI = getContainsPHI(input.containsPHI, getInputArray(input.assignmentCandidates));
  const inputSnapshotHash = getInputSnapshotHash(input);
  const isStale = getIsStale(input);
  const derivationHash = buildWorkAllocationPackageDerivationHash(input);
  const workAllocationPackageKey = stableSnapshotHash({
    organizationalUnitId,
    consumedCapacityPackageReferenceId: input.consumedCapacityPackageReferenceId,
    consumedCapacitySnapshotHash: input.consumedCapacitySnapshotHash,
    inputSnapshotHash,
    isStale,
    containsPHI,
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash,
    derivationHash,
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
    workAllocationPackage: {
      ...base,
      workAllocationPackageId: stableSnapshotHash({
        workAllocationPackageKey,
        artifactType: "SyntheticWorkAllocationPackage",
      }),
      workAllocationPackageKey,
      organizationalUnitId,
      workItemReferenceIds: getInputArray(input.workItemReferenceIds),
      assignmentCandidateReferenceIds: getAssignmentCandidateReferenceIds(input),
      consumedCapacityPackageReferenceId: input.consumedCapacityPackageReferenceId ?? "",
      consumedCapacitySnapshotHash: input.consumedCapacitySnapshotHash ?? "",
      capacityConflictsPresent: getCapacityConflictsPresent(input),
      inputSnapshotHash,
      isStale,
      isRecommendationOnly: true,
      noAutomaticAssignment: true,
      humanApprovesEveryAllocation: true,
      containsPHI,
      workAllocationPackageComplete: input.workAllocationPackageComplete === true,
      derivationHash,
    },
    skipped: false,
    warnings,
  };
}
