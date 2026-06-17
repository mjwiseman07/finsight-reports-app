import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticOrganizationAssignmentStatus,
  SyntheticOrganizationBaseContract,
  SyntheticOrganizationWorkforceMemberType,
  SyntheticPhase39RoleHandoffConsumptionContract,
  WorkforceAssignmentContract,
} from "../contracts";

export type SyntheticWorkforceType =
  | "human"
  | "ai"
  | "contractor"
  | "shared_service";

export interface BuildWorkforceAssignmentInput extends Partial<WorkforceAssignmentContract> {
  assignmentComplete?: boolean;
}

export interface BuildWorkforceCapabilityInput extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  capabilityType?: string;
  capabilitySourceReference?: string;
  aiWorkerCapabilitySourcePhase39ReferenceId?: string;
  capabilityComplete?: boolean;
}

export interface BuildWorkforceMemberInput extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  workforceType?: SyntheticWorkforceType;
  internalWorkforceId?: string;
  roleReference?: string;
  assignedUnitId?: string;
  assignedTeamId?: string;
  capabilityReferenceIds?: string[];
  aiWorkerSourcePhase39CompositionId?: string;
  memberStatus?: SyntheticOrganizationAssignmentStatus;
  containsPHI?: boolean;
  workforceMemberComplete?: boolean;
  assignments?: BuildWorkforceAssignmentInput[];
  capabilities?: BuildWorkforceCapabilityInput[];
}

export interface SyntheticWorkforceMember extends SyntheticPhase39RoleHandoffConsumptionContract {
  workforceMemberId: string;
  workforceMemberKey: string;
  workforceType: SyntheticWorkforceType;
  internalWorkforceId: string;
  roleReference: string;
  assignedUnitId: string;
  assignedTeamId: string;
  capabilityReferenceIds: string[];
  aiWorkerSourcePhase39CompositionId: string;
  memberStatus: SyntheticOrganizationAssignmentStatus;
  minimumIdentityOnly: true;
  noHrRecordStored: true;
  noPerformanceHistoryStored: true;
  noCompensationStored: true;
  noPersonalDataStored: true;
  containsPHI: boolean;
  workforceMemberComplete: boolean;
}

export interface SyntheticWorkforceAssignment extends WorkforceAssignmentContract {
  assignmentComplete: boolean;
}

export interface SyntheticWorkforceCapability extends SyntheticPhase39RoleHandoffConsumptionContract {
  capabilityId: string;
  capabilityKey: string;
  workforceMemberId: string;
  capabilityType: string;
  capabilitySourceReference: string;
  aiWorkerCapabilitySourcePhase39ReferenceId: string;
  capabilityComplete: boolean;
}

export interface BuildWorkforceMemberResult {
  workforceMember: SyntheticWorkforceMember | null;
  assignments: SyntheticWorkforceAssignment[];
  capabilities: SyntheticWorkforceCapability[];
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

function getAssignmentWorkforceMemberType(workforceType: SyntheticWorkforceType): SyntheticOrganizationWorkforceMemberType {
  return workforceType === "ai" ? "ai_worker" : workforceType;
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

function collectMissingRequiredIdentifiers(input: BuildWorkforceMemberInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.workforceType)) {
    missing.push("workforceType");
  }

  if (!hasValue(input.internalWorkforceId)) {
    missing.push("internalWorkforceId");
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

function buildWorkforceMemberDerivationHash(input: BuildWorkforceMemberInput): string {
  return stableSnapshotHash({
    workforceType: input.workforceType,
    internalWorkforceId: input.internalWorkforceId ?? "",
    roleReference: input.roleReference ?? "",
    assignedUnitId: input.assignedUnitId ?? "",
    assignedTeamId: input.assignedTeamId ?? "",
    capabilityReferenceIds: getInputArray(input.capabilityReferenceIds),
    aiWorkerSourcePhase39CompositionId: input.aiWorkerSourcePhase39CompositionId ?? "",
    memberStatus: input.memberStatus ?? "pending",
    minimumIdentityOnly: true,
    noHrRecordStored: true,
    noPerformanceHistoryStored: true,
    noCompensationStored: true,
    noPersonalDataStored: true,
    containsPHI: getContainsPHI(input.containsPHI),
    workforceMemberComplete: input.workforceMemberComplete === true,
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

function buildWorkforceAssignment(
  input: BuildWorkforceAssignmentInput,
  parent: SyntheticWorkforceMember,
  index: number,
): SyntheticWorkforceAssignment {
  const base = getPhase39HandoffBase(
    {
      ...input,
      containsPHI: getContainsPHI(input.containsPHI ?? parent.containsPHI),
      skippedIndexes: [...getInputArray(input.skippedIndexes), index],
    },
    parent,
  );
  const assignmentStatus = input.assignmentStatus ?? "pending";
  const workforceMemberType = input.workforceMemberType ?? getAssignmentWorkforceMemberType(parent.workforceType);
  const assignmentKey = stableSnapshotHash({
    workforceMemberId: input.workforceMemberId ?? parent.workforceMemberId,
    workforceMemberType,
    assignedUnitId: input.assignedUnitId ?? parent.assignedUnitId,
    assignedTeamId: input.assignedTeamId ?? parent.assignedTeamId,
    assignedCapabilityReferenceIds: getInputArray(
      input.assignedCapabilityReferenceIds ?? parent.capabilityReferenceIds,
    ),
    assignmentStatus,
    isRecommendationOnly: true,
    noAutomaticAssignment: true,
    boundPhase39SnapshotHash: base.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: base.boundPhase38SnapshotHash,
  });
  const derivationHash = stableSnapshotHash({
    assignmentKey,
    assignmentComplete: input.assignmentComplete === true,
    derivationLineageIds: base.derivationLineageIds,
    derivationMethod: base.derivationMethod,
  });

  return {
    ...base,
    assignmentId: stableSnapshotHash({
      assignmentKey,
      artifactType: "SyntheticWorkforceAssignment",
    }),
    assignmentKey,
    workforceMemberId: input.workforceMemberId ?? parent.workforceMemberId,
    workforceMemberType,
    assignedUnitId: input.assignedUnitId ?? parent.assignedUnitId,
    assignedTeamId: input.assignedTeamId ?? parent.assignedTeamId,
    assignedCapabilityReferenceIds: getInputArray(
      input.assignedCapabilityReferenceIds ?? parent.capabilityReferenceIds,
    ),
    assignmentStatus,
    isRecommendationOnly: true,
    noAutomaticAssignment: true,
    assignmentComplete: input.assignmentComplete === true,
    derivationHash,
  };
}

function buildWorkforceCapability(
  input: BuildWorkforceCapabilityInput,
  parent: SyntheticWorkforceMember,
  index: number,
): SyntheticWorkforceCapability {
  const base = getPhase39HandoffBase(
    {
      ...input,
      containsPHI: getContainsPHI(input.containsPHI ?? parent.containsPHI),
      skippedIndexes: [...getInputArray(input.skippedIndexes), index],
    },
    parent,
  );
  const capabilityKey = stableSnapshotHash({
    workforceMemberId: parent.workforceMemberId,
    capabilityType: input.capabilityType ?? "",
    capabilitySourceReference: input.capabilitySourceReference ?? "",
    aiWorkerCapabilitySourcePhase39ReferenceId: input.aiWorkerCapabilitySourcePhase39ReferenceId ?? "",
    boundPhase39SnapshotHash: base.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: base.boundPhase38SnapshotHash,
  });
  const derivationHash = stableSnapshotHash({
    capabilityKey,
    capabilityComplete: input.capabilityComplete === true,
    derivationLineageIds: base.derivationLineageIds,
    derivationMethod: base.derivationMethod,
  });

  return {
    ...base,
    capabilityId: stableSnapshotHash({
      capabilityKey,
      artifactType: "SyntheticWorkforceCapability",
    }),
    capabilityKey,
    workforceMemberId: parent.workforceMemberId,
    capabilityType: input.capabilityType ?? "",
    capabilitySourceReference: input.capabilitySourceReference ?? "",
    aiWorkerCapabilitySourcePhase39ReferenceId: input.aiWorkerCapabilitySourcePhase39ReferenceId ?? "",
    capabilityComplete: input.capabilityComplete === true,
    derivationHash,
  };
}

export function buildWorkforceMember(input: BuildWorkforceMemberInput): BuildWorkforceMemberResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      workforceMember: null,
      assignments: [],
      capabilities: [],
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const workforceType = input.workforceType as SyntheticWorkforceType;
  const containsPHI = getContainsPHI(input.containsPHI);
  const derivationHash = buildWorkforceMemberDerivationHash(input);
  const workforceMemberKey = stableSnapshotHash({
    workforceType,
    internalWorkforceId: input.internalWorkforceId ?? "",
    roleReference: input.roleReference ?? "",
    assignedUnitId: input.assignedUnitId ?? "",
    assignedTeamId: input.assignedTeamId ?? "",
    aiWorkerSourcePhase39CompositionId: input.aiWorkerSourcePhase39CompositionId ?? "",
    containsPHI,
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash,
    derivationHash,
  });
  const workforceMemberId = stableSnapshotHash({
    workforceMemberKey,
    artifactType: "SyntheticWorkforceMember",
  });
  const base = getPhase39HandoffBase(
    {
      ...input,
      containsPHI,
      derivationHash,
    },
    {},
  );
  const workforceMember: SyntheticWorkforceMember = {
    ...base,
    workforceMemberId,
    workforceMemberKey,
    workforceType,
    internalWorkforceId: input.internalWorkforceId ?? "",
    roleReference: input.roleReference ?? "",
    assignedUnitId: input.assignedUnitId ?? "",
    assignedTeamId: input.assignedTeamId ?? "",
    capabilityReferenceIds: getInputArray(input.capabilityReferenceIds),
    aiWorkerSourcePhase39CompositionId: input.aiWorkerSourcePhase39CompositionId ?? "",
    memberStatus: input.memberStatus ?? "pending",
    minimumIdentityOnly: true,
    noHrRecordStored: true,
    noPerformanceHistoryStored: true,
    noCompensationStored: true,
    noPersonalDataStored: true,
    containsPHI,
    workforceMemberComplete: input.workforceMemberComplete === true,
    derivationHash,
  };

  return {
    workforceMember,
    assignments: getInputArray(input.assignments).map((assignmentInput, index) =>
      buildWorkforceAssignment(assignmentInput, workforceMember, index),
    ),
    capabilities: getInputArray(input.capabilities).map((capabilityInput, index) =>
      buildWorkforceCapability(capabilityInput, workforceMember, index),
    ),
    skipped: false,
    warnings,
  };
}
