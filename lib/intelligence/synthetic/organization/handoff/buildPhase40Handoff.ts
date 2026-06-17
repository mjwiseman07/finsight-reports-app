import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticOrganizationBaseContract,
  SyntheticPhase39RoleHandoffConsumptionContract,
} from "../contracts";

export interface BuildPhase40HandoffInput extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  phase40OrganizationalHandoffHandle?: string;
  organizationalUnitReferenceIds?: string[];
  phase40DepartmentReferenceIds?: string[];
  phase40GovernanceReferenceIds?: string[];
  phase40CommandCenterReferenceIds?: string[];
  phase40TwinReferenceIds?: string[];
  phase40WorkforceRegistryReferenceIds?: string[];
  phase40CapacityReferenceIds?: string[];
  phase40EscalationReferenceIds?: string[];
  boundPhase40SnapshotHash?: string;
  containsPHI?: boolean;
  handoffReadyForPhase41?: boolean;
  phase40HandoffComplete?: boolean;
}

export interface SyntheticPhase40Handoff extends SyntheticPhase39RoleHandoffConsumptionContract {
  phase40HandoffId: string;
  phase40HandoffKey: string;
  phase40OrganizationalHandoffHandle: string;
  organizationalUnitReferenceIds: string[];
  phase40DepartmentReferenceIds: string[];
  phase40GovernanceReferenceIds: string[];
  phase40CommandCenterReferenceIds: string[];
  phase40TwinReferenceIds: string[];
  phase40WorkforceRegistryReferenceIds: string[];
  phase40CapacityReferenceIds: string[];
  phase40EscalationReferenceIds: string[];
  boundPhase40SnapshotHash: string;
  boundPhase39SnapshotHash: string;
  consumesPhase39Handoff: true;
  mirrorsPhase39HandoffStructure: true;
  handoffReadyForPhase41: boolean;
  phase40HandoffComplete: boolean;
}

export interface BuildPhase40HandoffResult {
  phase40Handoff: SyntheticPhase40Handoff | null;
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

function hasDerivablePhase40Snapshot(input: BuildPhase40HandoffInput): boolean {
  return [
    input.organizationalUnitReferenceIds,
    input.phase40DepartmentReferenceIds,
    input.phase40GovernanceReferenceIds,
    input.phase40CommandCenterReferenceIds,
    input.phase40TwinReferenceIds,
    input.phase40WorkforceRegistryReferenceIds,
    input.phase40CapacityReferenceIds,
    input.phase40EscalationReferenceIds,
  ].some((values) => getInputArray(values).length > 0);
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

function getBoundPhase40SnapshotHash(input: BuildPhase40HandoffInput): string {
  return (
    input.boundPhase40SnapshotHash ??
    stableSnapshotHash({
      organizationalUnitReferenceIds: getInputArray(input.organizationalUnitReferenceIds),
      phase40DepartmentReferenceIds: getInputArray(input.phase40DepartmentReferenceIds),
      phase40GovernanceReferenceIds: getInputArray(input.phase40GovernanceReferenceIds),
      phase40CommandCenterReferenceIds: getInputArray(input.phase40CommandCenterReferenceIds),
      phase40TwinReferenceIds: getInputArray(input.phase40TwinReferenceIds),
      phase40WorkforceRegistryReferenceIds: getInputArray(input.phase40WorkforceRegistryReferenceIds),
      phase40CapacityReferenceIds: getInputArray(input.phase40CapacityReferenceIds),
      phase40EscalationReferenceIds: getInputArray(input.phase40EscalationReferenceIds),
      phase40OrganizationalHandoffHandle: input.phase40OrganizationalHandoffHandle ?? "",
      boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
      boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    })
  );
}

function collectMissingRequiredIdentifiers(input: BuildPhase40HandoffInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.phase40OrganizationalHandoffHandle)) {
    missing.push("phase40OrganizationalHandoffHandle");
  }

  if (!hasValue(input.boundPhase40SnapshotHash) && !hasDerivablePhase40Snapshot(input)) {
    missing.push("boundPhase40SnapshotHash");
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

function buildPhase40HandoffDerivationHash(input: BuildPhase40HandoffInput): string {
  return stableSnapshotHash({
    phase40OrganizationalHandoffHandle: input.phase40OrganizationalHandoffHandle ?? "",
    organizationalUnitReferenceIds: getInputArray(input.organizationalUnitReferenceIds),
    phase40DepartmentReferenceIds: getInputArray(input.phase40DepartmentReferenceIds),
    phase40GovernanceReferenceIds: getInputArray(input.phase40GovernanceReferenceIds),
    phase40CommandCenterReferenceIds: getInputArray(input.phase40CommandCenterReferenceIds),
    phase40TwinReferenceIds: getInputArray(input.phase40TwinReferenceIds),
    phase40WorkforceRegistryReferenceIds: getInputArray(input.phase40WorkforceRegistryReferenceIds),
    phase40CapacityReferenceIds: getInputArray(input.phase40CapacityReferenceIds),
    phase40EscalationReferenceIds: getInputArray(input.phase40EscalationReferenceIds),
    boundPhase40SnapshotHash: getBoundPhase40SnapshotHash(input),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    consumesPhase39Handoff: true,
    mirrorsPhase39HandoffStructure: true,
    handoffReadyForPhase41: input.handoffReadyForPhase41 === true,
    phase40HandoffComplete: input.phase40HandoffComplete === true,
    containsPHI: getContainsPHI(input.containsPHI),
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildPhase40Handoff(input: BuildPhase40HandoffInput): BuildPhase40HandoffResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      phase40Handoff: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const phase40OrganizationalHandoffHandle = input.phase40OrganizationalHandoffHandle as string;
  const containsPHI = getContainsPHI(input.containsPHI);
  const boundPhase40SnapshotHash = getBoundPhase40SnapshotHash(input);
  const derivationHash = buildPhase40HandoffDerivationHash(input);
  const phase40HandoffKey = stableSnapshotHash({
    phase40OrganizationalHandoffHandle,
    boundPhase40SnapshotHash,
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash,
    containsPHI,
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
    phase40Handoff: {
      ...base,
      phase40HandoffId: stableSnapshotHash({
        phase40HandoffKey,
        artifactType: "SyntheticPhase40Handoff",
      }),
      phase40HandoffKey,
      phase40OrganizationalHandoffHandle,
      organizationalUnitReferenceIds: getInputArray(input.organizationalUnitReferenceIds),
      phase40DepartmentReferenceIds: getInputArray(input.phase40DepartmentReferenceIds),
      phase40GovernanceReferenceIds: getInputArray(input.phase40GovernanceReferenceIds),
      phase40CommandCenterReferenceIds: getInputArray(input.phase40CommandCenterReferenceIds),
      phase40TwinReferenceIds: getInputArray(input.phase40TwinReferenceIds),
      phase40WorkforceRegistryReferenceIds: getInputArray(input.phase40WorkforceRegistryReferenceIds),
      phase40CapacityReferenceIds: getInputArray(input.phase40CapacityReferenceIds),
      phase40EscalationReferenceIds: getInputArray(input.phase40EscalationReferenceIds),
      boundPhase40SnapshotHash,
      boundPhase39SnapshotHash: input.boundPhase39SnapshotHash as string,
      consumesPhase39Handoff: true,
      mirrorsPhase39HandoffStructure: true,
      handoffReadyForPhase41: input.handoffReadyForPhase41 === true,
      phase40HandoffComplete: input.phase40HandoffComplete === true,
      containsPHI,
      derivationHash,
    },
    skipped: false,
    warnings,
  };
}
