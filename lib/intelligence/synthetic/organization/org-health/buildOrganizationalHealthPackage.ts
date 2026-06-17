import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticOrganizationBaseContract,
  SyntheticPhase39RoleHandoffConsumptionContract,
} from "../contracts";

export type SyntheticOrganizationalHealthPersona =
  | "controller"
  | "cfo"
  | "manager"
  | "partner"
  | "audit_manager";

export interface BuildOrganizationalHealthPackageInput
  extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  organizationalUnitId?: string;
  teamHealthMetadata?: Record<string, unknown>;
  departmentHealthMetadata?: Record<string, unknown>;
  capacityHealthMetadata?: Record<string, unknown>;
  workloadHealthMetadata?: Record<string, unknown>;
  escalationHealthMetadata?: Record<string, unknown>;
  healthIndicators?: string[];
  bottleneckReferenceIds?: string[];
  consumedCapacityPackageReferenceId?: string;
  consumedEscalationPackageReferenceId?: string;
  surfacedToPersonas?: SyntheticOrganizationalHealthPersona[];
  inputSnapshotHash?: string;
  latestInputSnapshotHash?: string;
  isStale?: boolean;
  containsPHI?: boolean;
  organizationalHealthPackageComplete?: boolean;
}

export interface SyntheticOrganizationalHealthPackage
  extends SyntheticPhase39RoleHandoffConsumptionContract {
  organizationalHealthPackageId: string;
  organizationalHealthPackageKey: string;
  organizationalUnitId: string;
  teamHealthMetadata: Record<string, unknown>;
  departmentHealthMetadata: Record<string, unknown>;
  capacityHealthMetadata: Record<string, unknown>;
  workloadHealthMetadata: Record<string, unknown>;
  escalationHealthMetadata: Record<string, unknown>;
  healthIndicators: string[];
  bottleneckReferenceIds: string[];
  consumedCapacityPackageReferenceId: string;
  consumedEscalationPackageReferenceId: string;
  surfacedToPersonas: SyntheticOrganizationalHealthPersona[];
  isOperationalMetricsOnly: true;
  noEmployeeScoring: true;
  noEmployeeRanking: true;
  noHrEvaluation: true;
  excludesSimulationOutputs: true;
  workforceTypeFilterable: true;
  humanAndAiMetricsNotCoMingled: true;
  inputSnapshotHash: string;
  isStale: boolean;
  containsPHI: boolean;
  organizationalHealthPackageComplete: boolean;
}

export interface BuildOrganizationalHealthPackageResult {
  organizationalHealthPackage: SyntheticOrganizationalHealthPackage | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getInputRecord(value: Record<string, unknown> | undefined): Record<string, unknown> {
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

function getInputSnapshotHash(input: BuildOrganizationalHealthPackageInput): string {
  return (
    input.inputSnapshotHash ??
    stableSnapshotHash({
      organizationalUnitId: input.organizationalUnitId ?? "",
      teamHealthMetadata: getInputRecord(input.teamHealthMetadata),
      departmentHealthMetadata: getInputRecord(input.departmentHealthMetadata),
      capacityHealthMetadata: getInputRecord(input.capacityHealthMetadata),
      workloadHealthMetadata: getInputRecord(input.workloadHealthMetadata),
      escalationHealthMetadata: getInputRecord(input.escalationHealthMetadata),
      healthIndicators: getInputArray(input.healthIndicators),
      bottleneckReferenceIds: getInputArray(input.bottleneckReferenceIds),
      consumedCapacityPackageReferenceId: input.consumedCapacityPackageReferenceId ?? "",
      consumedEscalationPackageReferenceId: input.consumedEscalationPackageReferenceId ?? "",
      surfacedToPersonas: getInputArray(input.surfacedToPersonas),
      excludesSimulationOutputs: true,
      humanAndAiMetricsNotCoMingled: true,
      boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
      boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    })
  );
}

function getIsStale(input: BuildOrganizationalHealthPackageInput): boolean {
  return (
    input.isStale === true ||
    (hasValue(input.latestInputSnapshotHash) && input.latestInputSnapshotHash !== getInputSnapshotHash(input))
  );
}

function collectMissingRequiredIdentifiers(input: BuildOrganizationalHealthPackageInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.organizationalUnitId)) {
    missing.push("organizationalUnitId");
  }

  if (!hasValue(input.consumedCapacityPackageReferenceId)) {
    missing.push("consumedCapacityPackageReferenceId");
  }

  if (!hasValue(input.consumedEscalationPackageReferenceId)) {
    missing.push("consumedEscalationPackageReferenceId");
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

function buildOrganizationalHealthPackageDerivationHash(
  input: BuildOrganizationalHealthPackageInput,
): string {
  return stableSnapshotHash({
    organizationalUnitId: input.organizationalUnitId ?? "",
    teamHealthMetadata: getInputRecord(input.teamHealthMetadata),
    departmentHealthMetadata: getInputRecord(input.departmentHealthMetadata),
    capacityHealthMetadata: getInputRecord(input.capacityHealthMetadata),
    workloadHealthMetadata: getInputRecord(input.workloadHealthMetadata),
    escalationHealthMetadata: getInputRecord(input.escalationHealthMetadata),
    healthIndicators: getInputArray(input.healthIndicators),
    bottleneckReferenceIds: getInputArray(input.bottleneckReferenceIds),
    consumedCapacityPackageReferenceId: input.consumedCapacityPackageReferenceId ?? "",
    consumedEscalationPackageReferenceId: input.consumedEscalationPackageReferenceId ?? "",
    surfacedToPersonas: getInputArray(input.surfacedToPersonas),
    isOperationalMetricsOnly: true,
    noEmployeeScoring: true,
    noEmployeeRanking: true,
    noHrEvaluation: true,
    excludesSimulationOutputs: true,
    workforceTypeFilterable: true,
    humanAndAiMetricsNotCoMingled: true,
    inputSnapshotHash: getInputSnapshotHash(input),
    isStale: getIsStale(input),
    containsPHI: getContainsPHI(input.containsPHI),
    organizationalHealthPackageComplete: input.organizationalHealthPackageComplete === true,
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildOrganizationalHealthPackage(
  input: BuildOrganizationalHealthPackageInput,
): BuildOrganizationalHealthPackageResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      organizationalHealthPackage: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const organizationalUnitId = input.organizationalUnitId as string;
  const consumedCapacityPackageReferenceId = input.consumedCapacityPackageReferenceId as string;
  const consumedEscalationPackageReferenceId = input.consumedEscalationPackageReferenceId as string;
  const containsPHI = getContainsPHI(input.containsPHI);
  const inputSnapshotHash = getInputSnapshotHash(input);
  const isStale = getIsStale(input);
  const derivationHash = buildOrganizationalHealthPackageDerivationHash(input);
  const organizationalHealthPackageKey = stableSnapshotHash({
    organizationalUnitId,
    consumedCapacityPackageReferenceId,
    consumedEscalationPackageReferenceId,
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
    organizationalHealthPackage: {
      ...base,
      organizationalHealthPackageId: stableSnapshotHash({
        organizationalHealthPackageKey,
        artifactType: "SyntheticOrganizationalHealthPackage",
      }),
      organizationalHealthPackageKey,
      organizationalUnitId,
      teamHealthMetadata: getInputRecord(input.teamHealthMetadata),
      departmentHealthMetadata: getInputRecord(input.departmentHealthMetadata),
      capacityHealthMetadata: getInputRecord(input.capacityHealthMetadata),
      workloadHealthMetadata: getInputRecord(input.workloadHealthMetadata),
      escalationHealthMetadata: getInputRecord(input.escalationHealthMetadata),
      healthIndicators: getInputArray(input.healthIndicators),
      bottleneckReferenceIds: getInputArray(input.bottleneckReferenceIds),
      consumedCapacityPackageReferenceId,
      consumedEscalationPackageReferenceId,
      surfacedToPersonas: getInputArray(input.surfacedToPersonas),
      isOperationalMetricsOnly: true,
      noEmployeeScoring: true,
      noEmployeeRanking: true,
      noHrEvaluation: true,
      excludesSimulationOutputs: true,
      workforceTypeFilterable: true,
      humanAndAiMetricsNotCoMingled: true,
      inputSnapshotHash,
      isStale,
      containsPHI,
      organizationalHealthPackageComplete: input.organizationalHealthPackageComplete === true,
      derivationHash,
    },
    skipped: false,
    warnings,
  };
}
