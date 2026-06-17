import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticOrganizationBaseContract,
  SyntheticOrganizationWorkforceMemberType,
  SyntheticPhase39RoleHandoffConsumptionContract,
} from "../contracts";

export interface BuildOrganizationalTwinInput
  extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  organizationalUnitId?: string;
  twinSnapshotHash?: string;
  unitReferenceIds?: string[];
  departmentReferenceIds?: string[];
  teamReferenceIds?: string[];
  workforceMemberReferenceIds?: string[];
  workforceMemberTypeMap?: Record<string, SyntheticOrganizationWorkforceMemberType>;
  responsibilityMap?: Record<string, string[]>;
  capacityReferenceIds?: string[];
  escalationChainReferenceIds?: string[];
  assignmentReferenceIds?: string[];
  twinAsOfReference?: string;
  inputSnapshotHash?: string;
  latestInputSnapshotHash?: string;
  isStale?: boolean;
  containsPHI?: boolean;
  organizationalTwinComplete?: boolean;
}

export interface SyntheticOrganizationalTwin extends SyntheticPhase39RoleHandoffConsumptionContract {
  organizationalTwinId: string;
  organizationalTwinKey: string;
  organizationalUnitId: string;
  twinSnapshotHash: string;
  unitReferenceIds: string[];
  departmentReferenceIds: string[];
  teamReferenceIds: string[];
  workforceMemberReferenceIds: string[];
  workforceMemberTypeMap: Record<string, SyntheticOrganizationWorkforceMemberType>;
  responsibilityMap: Record<string, string[]>;
  capacityReferenceIds: string[];
  escalationChainReferenceIds: string[];
  assignmentReferenceIds: string[];
  twinAsOfReference: string;
  isStructuralModelOnly: true;
  isFoundationForSimulation: true;
  noExecution: true;
  inputSnapshotHash: string;
  isStale: boolean;
  containsPHI: boolean;
  organizationalTwinComplete: boolean;
}

export interface BuildOrganizationalTwinResult {
  organizationalTwin: SyntheticOrganizationalTwin | null;
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

function getTwinSnapshotHash(input: BuildOrganizationalTwinInput): string {
  return (
    input.twinSnapshotHash ??
    stableSnapshotHash({
      organizationalUnitId: input.organizationalUnitId ?? "",
      unitReferenceIds: getInputArray(input.unitReferenceIds),
      departmentReferenceIds: getInputArray(input.departmentReferenceIds),
      teamReferenceIds: getInputArray(input.teamReferenceIds),
      workforceMemberReferenceIds: getInputArray(input.workforceMemberReferenceIds),
      workforceMemberTypeMap: getInputRecord(input.workforceMemberTypeMap),
      responsibilityMap: getInputRecord(input.responsibilityMap),
      capacityReferenceIds: getInputArray(input.capacityReferenceIds),
      escalationChainReferenceIds: getInputArray(input.escalationChainReferenceIds),
      assignmentReferenceIds: getInputArray(input.assignmentReferenceIds),
      twinAsOfReference: input.twinAsOfReference ?? "",
      boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
      boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    })
  );
}

function getInputSnapshotHash(input: BuildOrganizationalTwinInput): string {
  return (
    input.inputSnapshotHash ??
    stableSnapshotHash({
      organizationalUnitId: input.organizationalUnitId ?? "",
      twinSnapshotHash: getTwinSnapshotHash(input),
      unitReferenceIds: getInputArray(input.unitReferenceIds),
      departmentReferenceIds: getInputArray(input.departmentReferenceIds),
      teamReferenceIds: getInputArray(input.teamReferenceIds),
      workforceMemberReferenceIds: getInputArray(input.workforceMemberReferenceIds),
      workforceMemberTypeMap: getInputRecord(input.workforceMemberTypeMap),
      responsibilityMap: getInputRecord(input.responsibilityMap),
      capacityReferenceIds: getInputArray(input.capacityReferenceIds),
      escalationChainReferenceIds: getInputArray(input.escalationChainReferenceIds),
      assignmentReferenceIds: getInputArray(input.assignmentReferenceIds),
      twinAsOfReference: input.twinAsOfReference ?? "",
      isStructuralModelOnly: true,
      isFoundationForSimulation: true,
      noExecution: true,
      boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
      boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    })
  );
}

function getIsStale(input: BuildOrganizationalTwinInput): boolean {
  return (
    input.isStale === true ||
    (hasValue(input.latestInputSnapshotHash) && input.latestInputSnapshotHash !== getInputSnapshotHash(input))
  );
}

function collectMissingRequiredIdentifiers(input: BuildOrganizationalTwinInput): string[] {
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

function buildOrganizationalTwinDerivationHash(input: BuildOrganizationalTwinInput): string {
  return stableSnapshotHash({
    organizationalUnitId: input.organizationalUnitId ?? "",
    twinSnapshotHash: getTwinSnapshotHash(input),
    unitReferenceIds: getInputArray(input.unitReferenceIds),
    departmentReferenceIds: getInputArray(input.departmentReferenceIds),
    teamReferenceIds: getInputArray(input.teamReferenceIds),
    workforceMemberReferenceIds: getInputArray(input.workforceMemberReferenceIds),
    workforceMemberTypeMap: getInputRecord(input.workforceMemberTypeMap),
    responsibilityMap: getInputRecord(input.responsibilityMap),
    capacityReferenceIds: getInputArray(input.capacityReferenceIds),
    escalationChainReferenceIds: getInputArray(input.escalationChainReferenceIds),
    assignmentReferenceIds: getInputArray(input.assignmentReferenceIds),
    twinAsOfReference: input.twinAsOfReference ?? "",
    isStructuralModelOnly: true,
    isFoundationForSimulation: true,
    noExecution: true,
    inputSnapshotHash: getInputSnapshotHash(input),
    isStale: getIsStale(input),
    containsPHI: getContainsPHI(input.containsPHI),
    organizationalTwinComplete: input.organizationalTwinComplete === true,
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildOrganizationalTwin(input: BuildOrganizationalTwinInput): BuildOrganizationalTwinResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      organizationalTwin: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const organizationalUnitId = input.organizationalUnitId as string;
  const containsPHI = getContainsPHI(input.containsPHI);
  const twinSnapshotHash = getTwinSnapshotHash(input);
  const inputSnapshotHash = getInputSnapshotHash(input);
  const isStale = getIsStale(input);
  const derivationHash = buildOrganizationalTwinDerivationHash(input);
  const organizationalTwinKey = stableSnapshotHash({
    organizationalUnitId,
    twinSnapshotHash,
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
    organizationalTwin: {
      ...base,
      organizationalTwinId: stableSnapshotHash({
        organizationalTwinKey,
        artifactType: "SyntheticOrganizationalTwin",
      }),
      organizationalTwinKey,
      organizationalUnitId,
      twinSnapshotHash,
      unitReferenceIds: getInputArray(input.unitReferenceIds),
      departmentReferenceIds: getInputArray(input.departmentReferenceIds),
      teamReferenceIds: getInputArray(input.teamReferenceIds),
      workforceMemberReferenceIds: getInputArray(input.workforceMemberReferenceIds),
      workforceMemberTypeMap: getInputRecord(input.workforceMemberTypeMap),
      responsibilityMap: getInputRecord(input.responsibilityMap),
      capacityReferenceIds: getInputArray(input.capacityReferenceIds),
      escalationChainReferenceIds: getInputArray(input.escalationChainReferenceIds),
      assignmentReferenceIds: getInputArray(input.assignmentReferenceIds),
      twinAsOfReference: input.twinAsOfReference ?? "",
      isStructuralModelOnly: true,
      isFoundationForSimulation: true,
      noExecution: true,
      inputSnapshotHash,
      isStale,
      containsPHI,
      organizationalTwinComplete: input.organizationalTwinComplete === true,
      derivationHash,
    },
    skipped: false,
    warnings,
  };
}
