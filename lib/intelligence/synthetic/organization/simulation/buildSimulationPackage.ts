import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticOrganizationBaseContract,
  SyntheticPhase39RoleHandoffConsumptionContract,
} from "../contracts";

export type SyntheticSimulationScenarioType =
  | "lose_worker"
  | "add_ai_worker"
  | "add_workers"
  | "volume_change"
  | "capacity_change"
  | "custom";

export interface BuildSimulationPackageInput
  extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  organizationalUnitId?: string;
  baseTwinReferenceId?: string;
  baseTwinSnapshotHash?: string;
  scenarioType?: SyntheticSimulationScenarioType;
  scenarioDescription?: string;
  scenarioAssumptions?: Record<string, unknown>;
  scenarioInputs?: Record<string, unknown>;
  projectedCapacityMetadata?: Record<string, unknown>;
  projectedWorkloadMetadata?: Record<string, unknown>;
  projectedBottleneckReferenceIds?: string[];
  projectedOutcomeMetadata?: Record<string, unknown>;
  predictiveModelReferenceId?: string;
  predictiveModelAccuracyLimitations?: string;
  simulationIsolation?: Record<string, unknown>;
  inputSnapshotHash?: string;
  latestInputSnapshotHash?: string;
  isStale?: boolean;
  containsPHI?: boolean;
  simulationPackageComplete?: boolean;
}

export interface SyntheticSimulationPackage extends SyntheticPhase39RoleHandoffConsumptionContract {
  simulationPackageId: string;
  simulationPackageKey: string;
  organizationalUnitId: string;
  baseTwinReferenceId: string;
  baseTwinSnapshotHash: string;
  scenarioType: SyntheticSimulationScenarioType;
  scenarioDescription: string;
  scenarioAssumptions: Record<string, unknown>;
  scenarioInputs: Record<string, unknown>;
  projectedCapacityMetadata: Record<string, unknown>;
  projectedWorkloadMetadata: Record<string, unknown>;
  projectedBottleneckReferenceIds: string[];
  projectedOutcomeMetadata: Record<string, unknown>;
  predictiveModelReferenceId: string;
  predictiveModelAccuracyLimitations: string;
  isSimulation: true;
  simulationIsolation: Record<string, unknown>;
  isProjectionNotForecastOfRecord: true;
  excludedFromOrganizationalHealth: true;
  excludedFromWorkforcePerformance: true;
  neverTriggersRealAction: true;
  assumptionsAttached: true;
  inputSnapshotHash: string;
  isStale: boolean;
  containsPHI: boolean;
  simulationPackageComplete: boolean;
}

export interface BuildSimulationPackageResult {
  simulationPackage: SyntheticSimulationPackage | null;
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

function getInputSnapshotHash(input: BuildSimulationPackageInput): string {
  return (
    input.inputSnapshotHash ??
    stableSnapshotHash({
      organizationalUnitId: input.organizationalUnitId ?? "",
      baseTwinReferenceId: input.baseTwinReferenceId ?? "",
      baseTwinSnapshotHash: input.baseTwinSnapshotHash ?? "",
      scenarioType: input.scenarioType ?? "",
      scenarioDescription: input.scenarioDescription ?? "",
      scenarioAssumptions: getInputRecord(input.scenarioAssumptions),
      scenarioInputs: getInputRecord(input.scenarioInputs),
      projectedCapacityMetadata: getInputRecord(input.projectedCapacityMetadata),
      projectedWorkloadMetadata: getInputRecord(input.projectedWorkloadMetadata),
      projectedBottleneckReferenceIds: getInputArray(input.projectedBottleneckReferenceIds),
      projectedOutcomeMetadata: getInputRecord(input.projectedOutcomeMetadata),
      predictiveModelReferenceId: input.predictiveModelReferenceId ?? "",
      predictiveModelAccuracyLimitations: input.predictiveModelAccuracyLimitations ?? "",
      simulationIsolation: getInputRecord(input.simulationIsolation),
      isSimulation: true,
      isProjectionNotForecastOfRecord: true,
      excludedFromOrganizationalHealth: true,
      excludedFromWorkforcePerformance: true,
      neverTriggersRealAction: true,
      assumptionsAttached: true,
      boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
      boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    })
  );
}

function getIsStale(input: BuildSimulationPackageInput): boolean {
  return (
    input.isStale === true ||
    (hasValue(input.latestInputSnapshotHash) && input.latestInputSnapshotHash !== getInputSnapshotHash(input))
  );
}

function collectMissingRequiredIdentifiers(input: BuildSimulationPackageInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.organizationalUnitId)) {
    missing.push("organizationalUnitId");
  }

  if (!hasValue(input.baseTwinReferenceId)) {
    missing.push("baseTwinReferenceId");
  }

  if (!hasValue(input.scenarioType)) {
    missing.push("scenarioType");
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

function buildSimulationPackageDerivationHash(input: BuildSimulationPackageInput): string {
  return stableSnapshotHash({
    organizationalUnitId: input.organizationalUnitId ?? "",
    baseTwinReferenceId: input.baseTwinReferenceId ?? "",
    baseTwinSnapshotHash: input.baseTwinSnapshotHash ?? "",
    scenarioType: input.scenarioType ?? "",
    scenarioDescription: input.scenarioDescription ?? "",
    scenarioAssumptions: getInputRecord(input.scenarioAssumptions),
    scenarioInputs: getInputRecord(input.scenarioInputs),
    projectedCapacityMetadata: getInputRecord(input.projectedCapacityMetadata),
    projectedWorkloadMetadata: getInputRecord(input.projectedWorkloadMetadata),
    projectedBottleneckReferenceIds: getInputArray(input.projectedBottleneckReferenceIds),
    projectedOutcomeMetadata: getInputRecord(input.projectedOutcomeMetadata),
    predictiveModelReferenceId: input.predictiveModelReferenceId ?? "",
    predictiveModelAccuracyLimitations: input.predictiveModelAccuracyLimitations ?? "",
    isSimulation: true,
    simulationIsolation: getInputRecord(input.simulationIsolation),
    isProjectionNotForecastOfRecord: true,
    excludedFromOrganizationalHealth: true,
    excludedFromWorkforcePerformance: true,
    neverTriggersRealAction: true,
    assumptionsAttached: true,
    inputSnapshotHash: getInputSnapshotHash(input),
    isStale: getIsStale(input),
    containsPHI: getContainsPHI(input.containsPHI),
    simulationPackageComplete: input.simulationPackageComplete === true,
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildSimulationPackage(input: BuildSimulationPackageInput): BuildSimulationPackageResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      simulationPackage: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const organizationalUnitId = input.organizationalUnitId as string;
  const baseTwinReferenceId = input.baseTwinReferenceId as string;
  const scenarioType = input.scenarioType as SyntheticSimulationScenarioType;
  const containsPHI = getContainsPHI(input.containsPHI);
  const inputSnapshotHash = getInputSnapshotHash(input);
  const isStale = getIsStale(input);
  const derivationHash = buildSimulationPackageDerivationHash(input);
  const simulationPackageKey = stableSnapshotHash({
    organizationalUnitId,
    baseTwinReferenceId,
    baseTwinSnapshotHash: input.baseTwinSnapshotHash ?? "",
    scenarioType,
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
    simulationPackage: {
      ...base,
      simulationPackageId: stableSnapshotHash({
        simulationPackageKey,
        artifactType: "SyntheticSimulationPackage",
      }),
      simulationPackageKey,
      organizationalUnitId,
      baseTwinReferenceId,
      baseTwinSnapshotHash: input.baseTwinSnapshotHash ?? "",
      scenarioType,
      scenarioDescription: input.scenarioDescription ?? "",
      scenarioAssumptions: getInputRecord(input.scenarioAssumptions),
      scenarioInputs: getInputRecord(input.scenarioInputs),
      projectedCapacityMetadata: getInputRecord(input.projectedCapacityMetadata),
      projectedWorkloadMetadata: getInputRecord(input.projectedWorkloadMetadata),
      projectedBottleneckReferenceIds: getInputArray(input.projectedBottleneckReferenceIds),
      projectedOutcomeMetadata: getInputRecord(input.projectedOutcomeMetadata),
      predictiveModelReferenceId: input.predictiveModelReferenceId ?? "",
      predictiveModelAccuracyLimitations: input.predictiveModelAccuracyLimitations ?? "",
      isSimulation: true,
      simulationIsolation: getInputRecord(input.simulationIsolation),
      isProjectionNotForecastOfRecord: true,
      excludedFromOrganizationalHealth: true,
      excludedFromWorkforcePerformance: true,
      neverTriggersRealAction: true,
      assumptionsAttached: true,
      inputSnapshotHash,
      isStale,
      containsPHI,
      simulationPackageComplete: input.simulationPackageComplete === true,
      derivationHash,
    },
    skipped: false,
    warnings,
  };
}
