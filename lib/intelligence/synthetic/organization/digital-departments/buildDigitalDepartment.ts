import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticOrganizationBaseContract,
  SyntheticPhase39RoleHandoffConsumptionContract,
} from "../contracts";

export type SyntheticDigitalDepartmentType = "accounting" | "audit" | "revenue_cycle" | "payroll" | "other";

export interface BuildDigitalDepartmentInput extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  departmentType?: SyntheticDigitalDepartmentType;
  departmentName?: string;
  organizationalUnitId?: string;
  humanMemberReferenceIds?: string[];
  aiWorkerReferenceIds?: string[];
  aiWorkerPhase39CompositionReferenceIds?: string[];
  assignmentReferenceIds?: string[];
  capacityPackageReferenceId?: string;
  escalationChainReferenceId?: string;
  commandCenterReferenceId?: string;
  governanceReferenceId?: string;
  healthPackageReferenceId?: string;
  departmentResponsibilityMap?: Record<string, string[]>;
  humanAndAiCompositionMap?: Record<string, unknown>;
  inputSnapshotHash?: string;
  latestInputSnapshotHash?: string;
  isStale?: boolean;
  containsPHI?: boolean;
  digitalDepartmentComplete?: boolean;
}

export interface SyntheticDigitalDepartment extends SyntheticPhase39RoleHandoffConsumptionContract {
  digitalDepartmentId: string;
  digitalDepartmentKey: string;
  departmentType: SyntheticDigitalDepartmentType;
  departmentName: string;
  organizationalUnitId: string;
  humanMemberReferenceIds: string[];
  aiWorkerReferenceIds: string[];
  aiWorkerPhase39CompositionReferenceIds: string[];
  assignmentReferenceIds: string[];
  capacityPackageReferenceId: string;
  escalationChainReferenceId: string;
  commandCenterReferenceId: string;
  governanceReferenceId: string;
  healthPackageReferenceId: string;
  departmentResponsibilityMap: Record<string, string[]>;
  humanAndAiCompositionMap: Record<string, unknown>;
  humansRetainFinalDecision: true;
  isNotReplacementForHumanDepartment: true;
  recommendationOnlyCoordination: true;
  inputSnapshotHash: string;
  isStale: boolean;
  containsPHI: boolean;
  digitalDepartmentComplete: boolean;
}

export interface BuildDigitalDepartmentResult {
  digitalDepartment: SyntheticDigitalDepartment | null;
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

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
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

function getInputSnapshotHash(input: BuildDigitalDepartmentInput): string {
  return (
    input.inputSnapshotHash ??
    stableSnapshotHash({
      departmentType: input.departmentType ?? "",
      departmentName: input.departmentName ?? "",
      organizationalUnitId: input.organizationalUnitId ?? "",
      humanMemberReferenceIds: getInputArray(input.humanMemberReferenceIds),
      aiWorkerReferenceIds: getInputArray(input.aiWorkerReferenceIds),
      aiWorkerPhase39CompositionReferenceIds: getInputArray(input.aiWorkerPhase39CompositionReferenceIds),
      assignmentReferenceIds: getInputArray(input.assignmentReferenceIds),
      capacityPackageReferenceId: input.capacityPackageReferenceId ?? "",
      escalationChainReferenceId: input.escalationChainReferenceId ?? "",
      commandCenterReferenceId: input.commandCenterReferenceId ?? "",
      governanceReferenceId: input.governanceReferenceId ?? "",
      healthPackageReferenceId: input.healthPackageReferenceId ?? "",
      departmentResponsibilityMap: getInputRecord(input.departmentResponsibilityMap),
      humanAndAiCompositionMap: getInputRecord(input.humanAndAiCompositionMap),
      humansRetainFinalDecision: true,
      isNotReplacementForHumanDepartment: true,
      recommendationOnlyCoordination: true,
      boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
      boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    })
  );
}

function getIsStale(input: BuildDigitalDepartmentInput): boolean {
  return (
    input.isStale === true ||
    (hasValue(input.latestInputSnapshotHash) && input.latestInputSnapshotHash !== getInputSnapshotHash(input))
  );
}

function collectMissingRequiredIdentifiers(input: BuildDigitalDepartmentInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.departmentType)) {
    missing.push("departmentType");
  }

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

function buildDigitalDepartmentDerivationHash(input: BuildDigitalDepartmentInput): string {
  return stableSnapshotHash({
    departmentType: input.departmentType ?? "",
    departmentName: input.departmentName ?? "",
    organizationalUnitId: input.organizationalUnitId ?? "",
    humanMemberReferenceIds: getInputArray(input.humanMemberReferenceIds),
    aiWorkerReferenceIds: getInputArray(input.aiWorkerReferenceIds),
    aiWorkerPhase39CompositionReferenceIds: getInputArray(input.aiWorkerPhase39CompositionReferenceIds),
    assignmentReferenceIds: getInputArray(input.assignmentReferenceIds),
    capacityPackageReferenceId: input.capacityPackageReferenceId ?? "",
    escalationChainReferenceId: input.escalationChainReferenceId ?? "",
    commandCenterReferenceId: input.commandCenterReferenceId ?? "",
    governanceReferenceId: input.governanceReferenceId ?? "",
    healthPackageReferenceId: input.healthPackageReferenceId ?? "",
    departmentResponsibilityMap: getInputRecord(input.departmentResponsibilityMap),
    humanAndAiCompositionMap: getInputRecord(input.humanAndAiCompositionMap),
    humansRetainFinalDecision: true,
    isNotReplacementForHumanDepartment: true,
    recommendationOnlyCoordination: true,
    inputSnapshotHash: getInputSnapshotHash(input),
    isStale: getIsStale(input),
    containsPHI: getContainsPHI(input.containsPHI),
    digitalDepartmentComplete: input.digitalDepartmentComplete === true,
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildDigitalDepartment(input: BuildDigitalDepartmentInput): BuildDigitalDepartmentResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      digitalDepartment: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const departmentType = input.departmentType as SyntheticDigitalDepartmentType;
  const organizationalUnitId = input.organizationalUnitId as string;
  const containsPHI = getContainsPHI(input.containsPHI);
  const inputSnapshotHash = getInputSnapshotHash(input);
  const isStale = getIsStale(input);
  const derivationHash = buildDigitalDepartmentDerivationHash(input);
  const digitalDepartmentKey = stableSnapshotHash({
    departmentType,
    departmentName: input.departmentName ?? "",
    organizationalUnitId,
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
    digitalDepartment: {
      ...base,
      digitalDepartmentId: stableSnapshotHash({
        digitalDepartmentKey,
        artifactType: "SyntheticDigitalDepartment",
      }),
      digitalDepartmentKey,
      departmentType,
      departmentName: input.departmentName ?? "",
      organizationalUnitId,
      humanMemberReferenceIds: getInputArray(input.humanMemberReferenceIds),
      aiWorkerReferenceIds: getInputArray(input.aiWorkerReferenceIds),
      aiWorkerPhase39CompositionReferenceIds: getInputArray(input.aiWorkerPhase39CompositionReferenceIds),
      assignmentReferenceIds: getInputArray(input.assignmentReferenceIds),
      capacityPackageReferenceId: input.capacityPackageReferenceId ?? "",
      escalationChainReferenceId: input.escalationChainReferenceId ?? "",
      commandCenterReferenceId: input.commandCenterReferenceId ?? "",
      governanceReferenceId: input.governanceReferenceId ?? "",
      healthPackageReferenceId: input.healthPackageReferenceId ?? "",
      departmentResponsibilityMap: getInputRecord(input.departmentResponsibilityMap),
      humanAndAiCompositionMap: getInputRecord(input.humanAndAiCompositionMap),
      humansRetainFinalDecision: true,
      isNotReplacementForHumanDepartment: true,
      recommendationOnlyCoordination: true,
      inputSnapshotHash,
      isStale,
      containsPHI,
      digitalDepartmentComplete: input.digitalDepartmentComplete === true,
      derivationHash,
    },
    skipped: false,
    warnings,
  };
}
