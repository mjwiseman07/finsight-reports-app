import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticOrganizationBaseContract,
  SyntheticOrganizationWorkforceTypeFilter,
  SyntheticPhase39RoleHandoffConsumptionContract,
} from "../contracts";

export type SyntheticWorkforcePerformancePersona =
  | "controller"
  | "cfo"
  | "manager"
  | "partner"
  | "audit_manager";

export interface BuildWorkforcePerformancePackageInput
  extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  organizationalUnitId?: string;
  teamReferenceId?: string;
  throughputMetadata?: Record<string, unknown>;
  completionMetadata?: Record<string, unknown>;
  backlogMetadata?: Record<string, unknown>;
  agingMetadata?: Record<string, unknown>;
  operationalOutcomeIndicators?: string[];
  workforceTypeFilter?: SyntheticOrganizationWorkforceTypeFilter;
  surfacedToPersonas?: SyntheticWorkforcePerformancePersona[];
  inputSnapshotHash?: string;
  latestInputSnapshotHash?: string;
  isStale?: boolean;
  containsPHI?: boolean;
  workforcePerformancePackageComplete?: boolean;
}

export interface SyntheticWorkforcePerformancePackage
  extends SyntheticPhase39RoleHandoffConsumptionContract {
  workforcePerformancePackageId: string;
  workforcePerformancePackageKey: string;
  organizationalUnitId: string;
  teamReferenceId: string;
  throughputMetadata: Record<string, unknown>;
  completionMetadata: Record<string, unknown>;
  backlogMetadata: Record<string, unknown>;
  agingMetadata: Record<string, unknown>;
  operationalOutcomeIndicators: string[];
  workforceTypeFilter: SyntheticOrganizationWorkforceTypeFilter;
  surfacedToPersonas: SyntheticWorkforcePerformancePersona[];
  isOperationalMetricsOnly: true;
  noEmployeeRanking: true;
  noEmployeeScoring: true;
  noHrEvaluation: true;
  noIndividualHumanPerformanceScoring: true;
  workforceTypeFilterable: true;
  humanAndAiMetricsNotCoMingled: true;
  excludesSimulationOutputs: true;
  inputSnapshotHash: string;
  isStale: boolean;
  containsPHI: boolean;
  workforcePerformancePackageComplete: boolean;
}

export interface BuildWorkforcePerformancePackageResult {
  workforcePerformancePackage: SyntheticWorkforcePerformancePackage | null;
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

function getWorkforceTypeFilter(
  inputWorkforceTypeFilter: SyntheticOrganizationWorkforceTypeFilter | undefined,
): SyntheticOrganizationWorkforceTypeFilter {
  return inputWorkforceTypeFilter ?? "all";
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

function getInputSnapshotHash(input: BuildWorkforcePerformancePackageInput): string {
  return (
    input.inputSnapshotHash ??
    stableSnapshotHash({
      organizationalUnitId: input.organizationalUnitId ?? "",
      teamReferenceId: input.teamReferenceId ?? "",
      throughputMetadata: getInputRecord(input.throughputMetadata),
      completionMetadata: getInputRecord(input.completionMetadata),
      backlogMetadata: getInputRecord(input.backlogMetadata),
      agingMetadata: getInputRecord(input.agingMetadata),
      operationalOutcomeIndicators: getInputArray(input.operationalOutcomeIndicators),
      workforceTypeFilter: getWorkforceTypeFilter(input.workforceTypeFilter),
      surfacedToPersonas: getInputArray(input.surfacedToPersonas),
      noIndividualHumanPerformanceScoring: true,
      excludesSimulationOutputs: true,
      humanAndAiMetricsNotCoMingled: true,
      boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
      boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    })
  );
}

function getIsStale(input: BuildWorkforcePerformancePackageInput): boolean {
  return (
    input.isStale === true ||
    (hasValue(input.latestInputSnapshotHash) && input.latestInputSnapshotHash !== getInputSnapshotHash(input))
  );
}

function collectMissingRequiredIdentifiers(input: BuildWorkforcePerformancePackageInput): string[] {
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

function buildWorkforcePerformancePackageDerivationHash(
  input: BuildWorkforcePerformancePackageInput,
): string {
  return stableSnapshotHash({
    organizationalUnitId: input.organizationalUnitId ?? "",
    teamReferenceId: input.teamReferenceId ?? "",
    throughputMetadata: getInputRecord(input.throughputMetadata),
    completionMetadata: getInputRecord(input.completionMetadata),
    backlogMetadata: getInputRecord(input.backlogMetadata),
    agingMetadata: getInputRecord(input.agingMetadata),
    operationalOutcomeIndicators: getInputArray(input.operationalOutcomeIndicators),
    workforceTypeFilter: getWorkforceTypeFilter(input.workforceTypeFilter),
    surfacedToPersonas: getInputArray(input.surfacedToPersonas),
    isOperationalMetricsOnly: true,
    noEmployeeRanking: true,
    noEmployeeScoring: true,
    noHrEvaluation: true,
    noIndividualHumanPerformanceScoring: true,
    workforceTypeFilterable: true,
    humanAndAiMetricsNotCoMingled: true,
    excludesSimulationOutputs: true,
    inputSnapshotHash: getInputSnapshotHash(input),
    isStale: getIsStale(input),
    containsPHI: getContainsPHI(input.containsPHI),
    workforcePerformancePackageComplete: input.workforcePerformancePackageComplete === true,
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildWorkforcePerformancePackage(
  input: BuildWorkforcePerformancePackageInput,
): BuildWorkforcePerformancePackageResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      workforcePerformancePackage: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const organizationalUnitId = input.organizationalUnitId as string;
  const containsPHI = getContainsPHI(input.containsPHI);
  const workforceTypeFilter = getWorkforceTypeFilter(input.workforceTypeFilter);
  const inputSnapshotHash = getInputSnapshotHash(input);
  const isStale = getIsStale(input);
  const derivationHash = buildWorkforcePerformancePackageDerivationHash(input);
  const workforcePerformancePackageKey = stableSnapshotHash({
    organizationalUnitId,
    teamReferenceId: input.teamReferenceId ?? "",
    workforceTypeFilter,
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
    workforcePerformancePackage: {
      ...base,
      workforcePerformancePackageId: stableSnapshotHash({
        workforcePerformancePackageKey,
        artifactType: "SyntheticWorkforcePerformancePackage",
      }),
      workforcePerformancePackageKey,
      organizationalUnitId,
      teamReferenceId: input.teamReferenceId ?? "",
      throughputMetadata: getInputRecord(input.throughputMetadata),
      completionMetadata: getInputRecord(input.completionMetadata),
      backlogMetadata: getInputRecord(input.backlogMetadata),
      agingMetadata: getInputRecord(input.agingMetadata),
      operationalOutcomeIndicators: getInputArray(input.operationalOutcomeIndicators),
      workforceTypeFilter,
      surfacedToPersonas: getInputArray(input.surfacedToPersonas),
      isOperationalMetricsOnly: true,
      noEmployeeRanking: true,
      noEmployeeScoring: true,
      noHrEvaluation: true,
      noIndividualHumanPerformanceScoring: true,
      workforceTypeFilterable: true,
      humanAndAiMetricsNotCoMingled: true,
      excludesSimulationOutputs: true,
      inputSnapshotHash,
      isStale,
      containsPHI,
      workforcePerformancePackageComplete: input.workforcePerformancePackageComplete === true,
      derivationHash,
    },
    skipped: false,
    warnings,
  };
}
