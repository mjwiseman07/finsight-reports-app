import { stableSnapshotHash } from "../../../core/hash";
import type {
  RecommendationAuditEntry,
  SyntheticOrganizationBaseContract,
  SyntheticOrganizationCapacityStatus,
  SyntheticOrganizationWorkforceMemberType,
  SyntheticPhase39RoleHandoffConsumptionContract,
} from "../contracts";

export type SyntheticAssignmentPermissionCheckResult = "pass" | "fail" | "not_evaluated";

export type SyntheticAssignmentReasonCode =
  | "capability_match"
  | "available_capacity"
  | "priority"
  | "escalation_chain_position";

export interface BuildAssignmentCandidateInput extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  workItemReference?: string;
  candidateWorkforceMemberId?: string;
  candidateWorkforceType?: SyntheticOrganizationWorkforceMemberType;
  matchedCapabilityReferenceIds?: string[];
  permissionCheckResult?: SyntheticAssignmentPermissionCheckResult;
  capacityReferenceId?: string;
  capacityStatusAtRecommendation?: SyntheticOrganizationCapacityStatus;
  capacityConflictFlag?: boolean;
  priorityReference?: string;
  reasonCodes?: SyntheticAssignmentReasonCode[];
  recommendationRank?: number;
  recipientReferenceId?: string;
  inputSnapshotHash?: string;
  latestInputSnapshotHash?: string;
  recommendationTimestamp?: string;
  humanDecisionOutcome?: string;
  priorEntryReferenceId?: string;
  containsPHI?: boolean;
  assignmentCandidateComplete?: boolean;
}

export interface SyntheticAssignmentCandidate extends SyntheticPhase39RoleHandoffConsumptionContract {
  assignmentCandidateId: string;
  assignmentCandidateKey: string;
  workItemReference: string;
  candidateWorkforceMemberId: string;
  candidateWorkforceType: SyntheticOrganizationWorkforceMemberType;
  matchedCapabilityReferenceIds: string[];
  permissionCheckResult: SyntheticAssignmentPermissionCheckResult;
  capacityReferenceId: string;
  capacityStatusAtRecommendation: SyntheticOrganizationCapacityStatus;
  capacityConflictFlag: boolean;
  priorityReference: string;
  reasonCodes: SyntheticAssignmentReasonCode[];
  recommendationRank: number;
  isRecommendationOnly: true;
  requiresHumanApproval: true;
  recommendationAuditEntryReferenceId: string;
  containsPHI: boolean;
  assignmentCandidateComplete: boolean;
}

export interface BuildAssignmentCandidateResult {
  assignmentCandidate: SyntheticAssignmentCandidate | null;
  recommendationAuditEntry: RecommendationAuditEntry | null;
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

function getCapacityConflictFlag(input: BuildAssignmentCandidateInput): boolean {
  return input.capacityConflictFlag === true || input.capacityStatusAtRecommendation === "overloaded";
}

function getInputSnapshotHash(input: BuildAssignmentCandidateInput): string {
  return (
    input.inputSnapshotHash ??
    stableSnapshotHash({
      workItemReference: input.workItemReference ?? "",
      candidateWorkforceMemberId: input.candidateWorkforceMemberId ?? "",
      matchedCapabilityReferenceIds: getInputArray(input.matchedCapabilityReferenceIds),
      capacityReferenceId: input.capacityReferenceId ?? "",
      capacityStatusAtRecommendation: input.capacityStatusAtRecommendation ?? "not_evaluated",
      priorityReference: input.priorityReference ?? "",
      reasonCodes: getInputArray(input.reasonCodes),
      boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
      boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    })
  );
}

function getIsStale(input: BuildAssignmentCandidateInput): boolean {
  return hasValue(input.latestInputSnapshotHash) && input.latestInputSnapshotHash !== getInputSnapshotHash(input);
}

function getPayloadHash(input: BuildAssignmentCandidateInput): string {
  return stableSnapshotHash({
    workItemReference: input.workItemReference ?? "",
    candidateWorkforceMemberId: input.candidateWorkforceMemberId ?? "",
    candidateWorkforceType: input.candidateWorkforceType ?? "shared_service",
    matchedCapabilityReferenceIds: getInputArray(input.matchedCapabilityReferenceIds),
    permissionCheckResult: input.permissionCheckResult ?? "not_evaluated",
    capacityReferenceId: input.capacityReferenceId ?? "",
    capacityStatusAtRecommendation: input.capacityStatusAtRecommendation ?? "not_evaluated",
    capacityConflictFlag: getCapacityConflictFlag(input),
    priorityReference: input.priorityReference ?? "",
    reasonCodes: getInputArray(input.reasonCodes),
    recommendationRank: input.recommendationRank ?? 0,
    isRecommendationOnly: true,
    requiresHumanApproval: true,
    containsPHI: getContainsPHI(input.containsPHI),
  });
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

function collectMissingRequiredIdentifiers(input: BuildAssignmentCandidateInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.workItemReference)) {
    missing.push("workItemReference");
  }

  if (!hasValue(input.candidateWorkforceMemberId)) {
    missing.push("candidateWorkforceMemberId");
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

function buildRecommendationAuditEntry(
  input: BuildAssignmentCandidateInput,
  derivationHash: string,
): RecommendationAuditEntry {
  const containsPHI = getContainsPHI(input.containsPHI);
  const base = getPhase39HandoffBase(
    {
      ...input,
      containsPHI,
      derivationHash,
    },
    {},
  );
  const inputSnapshotHash = getInputSnapshotHash(input);
  const payloadHash = getPayloadHash(input);
  const recommendationAuditEntryKey = stableSnapshotHash({
    recommendationType: "allocation",
    recommenderModule: "work_allocation",
    recipientReferenceId: input.recipientReferenceId ?? input.candidateWorkforceMemberId ?? "",
    payloadHash,
    inputSnapshotHash,
    isStale: getIsStale(input),
    priorEntryReferenceId: input.priorEntryReferenceId ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
  });

  return {
    ...base,
    recommendationAuditEntryId: stableSnapshotHash({
      recommendationAuditEntryKey,
      artifactType: "RecommendationAuditEntry",
    }),
    recommendationAuditEntryKey,
    recommendationType: "allocation",
    recommenderModule: "work_allocation",
    recipientReferenceId: input.recipientReferenceId ?? input.candidateWorkforceMemberId ?? "",
    payloadHash,
    inputSnapshotHash,
    isStale: getIsStale(input),
    recommendationTimestamp: input.recommendationTimestamp ?? "",
    humanDecisionOutcome: input.humanDecisionOutcome ?? "",
    priorEntryReferenceId: input.priorEntryReferenceId ?? "",
    appendOnly: true,
    immutableRecord: true,
    containsPHI,
    derivationHash,
  };
}

function buildAssignmentCandidateDerivationHash(input: BuildAssignmentCandidateInput): string {
  return stableSnapshotHash({
    workItemReference: input.workItemReference ?? "",
    candidateWorkforceMemberId: input.candidateWorkforceMemberId ?? "",
    candidateWorkforceType: input.candidateWorkforceType ?? "shared_service",
    matchedCapabilityReferenceIds: getInputArray(input.matchedCapabilityReferenceIds),
    permissionCheckResult: input.permissionCheckResult ?? "not_evaluated",
    capacityReferenceId: input.capacityReferenceId ?? "",
    capacityStatusAtRecommendation: input.capacityStatusAtRecommendation ?? "not_evaluated",
    capacityConflictFlag: getCapacityConflictFlag(input),
    priorityReference: input.priorityReference ?? "",
    reasonCodes: getInputArray(input.reasonCodes),
    recommendationRank: input.recommendationRank ?? 0,
    isRecommendationOnly: true,
    requiresHumanApproval: true,
    payloadHash: getPayloadHash(input),
    inputSnapshotHash: getInputSnapshotHash(input),
    isStale: getIsStale(input),
    containsPHI: getContainsPHI(input.containsPHI),
    assignmentCandidateComplete: input.assignmentCandidateComplete === true,
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildAssignmentCandidate(
  input: BuildAssignmentCandidateInput,
): BuildAssignmentCandidateResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      assignmentCandidate: null,
      recommendationAuditEntry: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const workItemReference = input.workItemReference as string;
  const candidateWorkforceMemberId = input.candidateWorkforceMemberId as string;
  const containsPHI = getContainsPHI(input.containsPHI);
  const candidateWorkforceType = input.candidateWorkforceType ?? "shared_service";
  const permissionCheckResult = input.permissionCheckResult ?? "not_evaluated";
  const capacityStatusAtRecommendation = input.capacityStatusAtRecommendation ?? "not_evaluated";
  const capacityConflictFlag = getCapacityConflictFlag(input);
  const derivationHash = buildAssignmentCandidateDerivationHash(input);
  const recommendationAuditEntry = buildRecommendationAuditEntry(input, derivationHash);
  const assignmentCandidateKey = stableSnapshotHash({
    workItemReference,
    candidateWorkforceMemberId,
    candidateWorkforceType,
    capacityReferenceId: input.capacityReferenceId ?? "",
    capacityStatusAtRecommendation,
    capacityConflictFlag,
    recommendationAuditEntryReferenceId: recommendationAuditEntry.recommendationAuditEntryId,
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
    assignmentCandidate: {
      ...base,
      assignmentCandidateId: stableSnapshotHash({
        assignmentCandidateKey,
        artifactType: "SyntheticAssignmentCandidate",
      }),
      assignmentCandidateKey,
      workItemReference,
      candidateWorkforceMemberId,
      candidateWorkforceType,
      matchedCapabilityReferenceIds: getInputArray(input.matchedCapabilityReferenceIds),
      permissionCheckResult,
      capacityReferenceId: input.capacityReferenceId ?? "",
      capacityStatusAtRecommendation,
      capacityConflictFlag,
      priorityReference: input.priorityReference ?? "",
      reasonCodes: getInputArray(input.reasonCodes),
      recommendationRank: input.recommendationRank ?? 0,
      isRecommendationOnly: true,
      requiresHumanApproval: true,
      recommendationAuditEntryReferenceId: recommendationAuditEntry.recommendationAuditEntryId,
      containsPHI,
      assignmentCandidateComplete: input.assignmentCandidateComplete === true,
      derivationHash,
    },
    recommendationAuditEntry,
    skipped: false,
    warnings,
  };
}
