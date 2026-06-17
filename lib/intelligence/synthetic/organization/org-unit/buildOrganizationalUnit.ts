import { stableSnapshotHash } from "../../../core/hash";
import type {
  OrganizationalUnitContract,
  SyntheticOrganizationBaseContract,
  SyntheticOrganizationTeamType,
  SyntheticOrganizationUnitType,
  SyntheticPhase39RoleHandoffConsumptionContract,
  TeamContract,
} from "../contracts";

export type SyntheticDepartmentType =
  | "accounting"
  | "audit"
  | "revenue_cycle"
  | "payroll"
  | "other";

export interface BuildDepartmentInput extends Partial<SyntheticOrganizationBaseContract> {
  departmentName?: string;
  parentUnitId?: string;
  departmentType?: SyntheticDepartmentType;
  teamReferenceIds?: string[];
  governanceReferenceId?: string;
  containsPHI?: boolean;
  departmentComplete?: boolean;
}

export interface BuildTeamInput extends Partial<TeamContract> {
  teamName?: string;
  parentUnitId?: string;
  parentDepartmentId?: string;
  teamLeadReferenceId?: string;
  memberReferenceIds?: string[];
  teamType?: SyntheticOrganizationTeamType;
  containsPHI?: boolean;
  teamComplete?: boolean;
}

export interface BuildOrganizationalUnitInput extends Partial<OrganizationalUnitContract> {
  unitType?: SyntheticOrganizationUnitType;
  unitName?: string;
  parentUnitId?: string;
  hierarchyLevel?: number;
  childUnitReferenceIds?: string[];
  reportingStructureReferenceIds?: string[];
  ownershipReferenceId?: string;
  governanceReferenceId?: string;
  configuredEscalationChainReferenceId?: string;
  configuredEscalationChainSteps?: Array<Record<string, unknown>>;
  isHealthcareUnit?: boolean;
  containsPHI?: boolean;
  unitComplete?: boolean;
  departments?: BuildDepartmentInput[];
  teams?: BuildTeamInput[];
}

export interface SyntheticOrganizationalUnit extends OrganizationalUnitContract {
  childUnitReferenceIds: string[];
  configuredEscalationChainSteps: Array<Record<string, unknown>>;
  containsPHI: boolean;
  unitComplete: boolean;
}

export interface SyntheticDepartment extends SyntheticPhase39RoleHandoffConsumptionContract {
  departmentId: string;
  departmentKey: string;
  departmentName: string;
  parentUnitId: string;
  departmentType: SyntheticDepartmentType;
  teamReferenceIds: string[];
  governanceReferenceId: string;
  containsPHI: boolean;
  departmentComplete: boolean;
}

export interface SyntheticTeam extends TeamContract {
  parentDepartmentId: string;
  containsPHI: boolean;
  teamComplete: boolean;
}

export interface BuildOrganizationalUnitResult {
  organizationalUnit: SyntheticOrganizationalUnit | null;
  departments: SyntheticDepartment[];
  teams: SyntheticTeam[];
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined, isHealthcareUnit: boolean): boolean {
  if (isHealthcareUnit) {
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

function collectMissingRequiredIdentifiers(input: BuildOrganizationalUnitInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.unitType)) {
    missing.push("unitType");
  }

  if (!hasValue(input.unitName)) {
    missing.push("unitName");
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

function buildOrganizationalUnitDerivationHash(input: BuildOrganizationalUnitInput): string {
  return stableSnapshotHash({
    unitType: input.unitType,
    unitName: input.unitName ?? "",
    parentUnitId: input.parentUnitId ?? "",
    hierarchyLevel: input.hierarchyLevel ?? 0,
    childUnitReferenceIds: getInputArray(input.childUnitReferenceIds),
    reportingStructureReferenceIds: getInputArray(input.reportingStructureReferenceIds),
    ownershipReferenceId: input.ownershipReferenceId ?? "",
    governanceReferenceId: input.governanceReferenceId ?? "",
    configuredEscalationChainReferenceId: input.configuredEscalationChainReferenceId ?? "",
    configuredEscalationChainSteps: getInputArray(input.configuredEscalationChainSteps),
    isHealthcareUnit: input.isHealthcareUnit === true,
    containsPHI: getContainsPHI(input.containsPHI, input.isHealthcareUnit === true),
    unitComplete: input.unitComplete === true,
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

function buildDepartment(
  input: BuildDepartmentInput,
  parent: SyntheticOrganizationalUnit,
  index: number,
): SyntheticDepartment {
  const containsPHI = getContainsPHI(input.containsPHI, parent.isHealthcareUnit);
  const base = getPhase39HandoffBase(
    {
      ...input,
      containsPHI,
      skippedIndexes: [...getInputArray(input.skippedIndexes), index],
    },
    parent,
  );
  const departmentType = input.departmentType ?? "other";
  const departmentKey = stableSnapshotHash({
    parentUnitId: input.parentUnitId ?? parent.organizationalUnitId,
    departmentName: input.departmentName ?? "",
    departmentType,
    teamReferenceIds: getInputArray(input.teamReferenceIds),
    governanceReferenceId: input.governanceReferenceId ?? parent.governanceReferenceId,
    containsPHI,
    boundPhase39SnapshotHash: base.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: base.boundPhase38SnapshotHash,
  });
  const derivationHash = stableSnapshotHash({
    departmentKey,
    departmentComplete: input.departmentComplete === true,
    derivationLineageIds: base.derivationLineageIds,
    derivationMethod: base.derivationMethod,
  });

  return {
    ...base,
    departmentId: stableSnapshotHash({
      departmentKey,
      artifactType: "SyntheticDepartment",
    }),
    departmentKey,
    departmentName: input.departmentName ?? "",
    parentUnitId: input.parentUnitId ?? parent.organizationalUnitId,
    departmentType,
    teamReferenceIds: getInputArray(input.teamReferenceIds),
    governanceReferenceId: input.governanceReferenceId ?? parent.governanceReferenceId,
    containsPHI,
    departmentComplete: input.departmentComplete === true,
    derivationHash,
  };
}

function buildTeam(input: BuildTeamInput, parent: SyntheticOrganizationalUnit, index: number): SyntheticTeam {
  const containsPHI = getContainsPHI(input.containsPHI, parent.isHealthcareUnit);
  const base = getPhase39HandoffBase(
    {
      ...input,
      containsPHI,
      skippedIndexes: [...getInputArray(input.skippedIndexes), index],
    },
    parent,
  );
  const teamType = input.teamType ?? "hybrid";
  const teamKey = stableSnapshotHash({
    parentUnitId: input.parentUnitId ?? parent.organizationalUnitId,
    parentDepartmentId: input.parentDepartmentId ?? "",
    teamName: input.teamName ?? "",
    teamLeadReferenceId: input.teamLeadReferenceId ?? "",
    memberReferenceIds: getInputArray(input.memberReferenceIds),
    teamType,
    containsPHI,
    boundPhase39SnapshotHash: base.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: base.boundPhase38SnapshotHash,
  });
  const derivationHash = stableSnapshotHash({
    teamKey,
    teamComplete: input.teamComplete === true,
    derivationLineageIds: base.derivationLineageIds,
    derivationMethod: base.derivationMethod,
  });

  return {
    ...base,
    teamId: stableSnapshotHash({
      teamKey,
      artifactType: "SyntheticTeam",
    }),
    teamKey,
    teamName: input.teamName ?? "",
    parentUnitId: input.parentUnitId ?? parent.organizationalUnitId,
    parentDepartmentId: input.parentDepartmentId ?? "",
    teamLeadReferenceId: input.teamLeadReferenceId ?? "",
    memberReferenceIds: getInputArray(input.memberReferenceIds),
    teamType,
    containsPHI,
    teamComplete: input.teamComplete === true,
    derivationHash,
  };
}

export function buildOrganizationalUnit(input: BuildOrganizationalUnitInput): BuildOrganizationalUnitResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      organizationalUnit: null,
      departments: [],
      teams: [],
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const unitType = input.unitType as SyntheticOrganizationUnitType;
  const isHealthcareUnit = input.isHealthcareUnit === true;
  const containsPHI = getContainsPHI(input.containsPHI, isHealthcareUnit);
  const derivationHash = buildOrganizationalUnitDerivationHash(input);
  const organizationalUnitKey = stableSnapshotHash({
    unitType,
    unitName: input.unitName ?? "",
    parentUnitId: input.parentUnitId ?? "",
    hierarchyLevel: input.hierarchyLevel ?? 0,
    configuredEscalationChainReferenceId: input.configuredEscalationChainReferenceId ?? "",
    containsPHI,
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash,
    derivationHash,
  });
  const organizationalUnitId = stableSnapshotHash({
    organizationalUnitKey,
    artifactType: "SyntheticOrganizationalUnit",
  });
  const base = getPhase39HandoffBase(
    {
      ...input,
      containsPHI,
      derivationHash,
    },
    {},
  );
  const organizationalUnit: SyntheticOrganizationalUnit = {
    ...base,
    organizationalUnitId,
    organizationalUnitKey,
    unitType,
    unitName: input.unitName ?? "",
    parentUnitId: input.parentUnitId ?? "",
    hierarchyLevel: input.hierarchyLevel ?? 0,
    childUnitReferenceIds: getInputArray(input.childUnitReferenceIds),
    reportingStructureReferenceIds: getInputArray(input.reportingStructureReferenceIds),
    ownershipReferenceId: input.ownershipReferenceId ?? "",
    governanceReferenceId: input.governanceReferenceId ?? "",
    configuredEscalationChainReferenceId: input.configuredEscalationChainReferenceId ?? "",
    configuredEscalationChainSteps: getInputArray(input.configuredEscalationChainSteps),
    isHealthcareUnit,
    containsPHI,
    unitComplete: input.unitComplete === true,
    derivationHash,
  };

  return {
    organizationalUnit,
    departments: getInputArray(input.departments).map((departmentInput, index) =>
      buildDepartment(departmentInput, organizationalUnit, index),
    ),
    teams: getInputArray(input.teams).map((teamInput, index) => buildTeam(teamInput, organizationalUnit, index)),
    skipped: false,
    warnings,
  };
}
