import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticOrganizationBaseContract,
  SyntheticPhase39RoleHandoffConsumptionContract,
} from "../contracts";

export type SyntheticRevenueCycleCommandCenterPersona = "controller" | "cfo" | "manager";

export interface BuildRevenueCycleCommandCenterPackageInput
  extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  organizationalUnitId?: string;
  period?: string;
  isHealthcareUnit?: boolean;
  denialReferenceIds?: string[];
  collectionsReferenceIds?: string[];
  dsoMetadata?: Record<string, unknown>;
  agingMetadata?: Record<string, unknown>;
  escalationReferenceIds?: string[];
  perPatientDayMetadata?: Record<string, unknown>;
  predictiveAnalysisReferenceIds?: string[];
  industryIntelligenceLibraryReferenceId?: string;
  consumedPhase39RoleOutputReferenceIds?: string[];
  itemsRequiringHumanDecisionReferenceIds?: string[];
  itemsRequiringHumanDecisionCount?: number;
  revenueCycleStatusSummary?: string;
  surfacedToPersonas?: SyntheticRevenueCycleCommandCenterPersona[];
  packageKeyTuple?: string;
  inputSnapshotHash?: string;
  latestInputSnapshotHash?: string;
  isStale?: boolean;
  containsPHI?: boolean;
  revenueCycleCommandCenterPackageComplete?: boolean;
}

export interface SyntheticRevenueCycleCommandCenterPackage
  extends SyntheticPhase39RoleHandoffConsumptionContract {
  revenueCycleCommandCenterPackageId: string;
  revenueCycleCommandCenterPackageKey: string;
  organizationalUnitId: string;
  period: string;
  isHealthcareUnit: boolean;
  denialReferenceIds: string[];
  collectionsReferenceIds: string[];
  dsoMetadata: Record<string, unknown>;
  agingMetadata: Record<string, unknown>;
  escalationReferenceIds: string[];
  perPatientDayMetadata: Record<string, unknown>;
  predictiveAnalysisReferenceIds: string[];
  industryIntelligenceLibraryReferenceId: string;
  consumedPhase39RoleOutputReferenceIds: string[];
  itemsRequiringHumanDecisionReferenceIds: string[];
  itemsRequiringHumanDecisionCount: number;
  revenueCycleStatusSummary: string;
  surfacedToPersonas: SyntheticRevenueCycleCommandCenterPersona[];
  packageKeyTuple: string;
  updateInPlace: true;
  noDuplicateOnRerun: true;
  noTimestampInHashInputs: true;
  containsPHI: boolean;
  phiMarkedWhenHealthcareUnit: true;
  phiArtifactRequiresIsolationFields: true;
  noMixingPhiAndNonPhiInSamePayload: true;
  hipaaControlsDeferredToPhase42_5: true;
  inputSnapshotHash: string;
  isStale: boolean;
  revenueCycleCommandCenterPackageComplete: boolean;
}

export interface BuildRevenueCycleCommandCenterPackageResult {
  revenueCycleCommandCenterPackage: SyntheticRevenueCycleCommandCenterPackage | null;
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

function getIsHealthcareUnit(inputIsHealthcareUnit: boolean | undefined): boolean {
  return inputIsHealthcareUnit === true;
}

function getContainsPHI(input: Pick<BuildRevenueCycleCommandCenterPackageInput, "containsPHI" | "isHealthcareUnit">): boolean {
  if (getIsHealthcareUnit(input.isHealthcareUnit)) {
    return true;
  }

  return input.containsPHI ?? true;
}

function getItemsRequiringHumanDecisionCount(input: BuildRevenueCycleCommandCenterPackageInput): number {
  return input.itemsRequiringHumanDecisionCount ?? getInputArray(input.itemsRequiringHumanDecisionReferenceIds).length;
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

function getInputSnapshotHash(input: BuildRevenueCycleCommandCenterPackageInput): string {
  return (
    input.inputSnapshotHash ??
    stableSnapshotHash({
      organizationalUnitId: input.organizationalUnitId ?? "",
      period: input.period ?? "",
      isHealthcareUnit: getIsHealthcareUnit(input.isHealthcareUnit),
      denialReferenceIds: getInputArray(input.denialReferenceIds),
      collectionsReferenceIds: getInputArray(input.collectionsReferenceIds),
      dsoMetadata: getInputRecord(input.dsoMetadata),
      agingMetadata: getInputRecord(input.agingMetadata),
      escalationReferenceIds: getInputArray(input.escalationReferenceIds),
      perPatientDayMetadata: getInputRecord(input.perPatientDayMetadata),
      predictiveAnalysisReferenceIds: getInputArray(input.predictiveAnalysisReferenceIds),
      industryIntelligenceLibraryReferenceId: input.industryIntelligenceLibraryReferenceId ?? "",
      consumedPhase39RoleOutputReferenceIds: getInputArray(input.consumedPhase39RoleOutputReferenceIds),
      itemsRequiringHumanDecisionReferenceIds: getInputArray(input.itemsRequiringHumanDecisionReferenceIds),
      itemsRequiringHumanDecisionCount: getItemsRequiringHumanDecisionCount(input),
      revenueCycleStatusSummary: input.revenueCycleStatusSummary ?? "",
      surfacedToPersonas: getInputArray(input.surfacedToPersonas),
      containsPHI: getContainsPHI(input),
      noTimestampInHashInputs: true,
      boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
      boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    })
  );
}

function getIsStale(input: BuildRevenueCycleCommandCenterPackageInput): boolean {
  return (
    input.isStale === true ||
    (hasValue(input.latestInputSnapshotHash) && input.latestInputSnapshotHash !== getInputSnapshotHash(input))
  );
}

function getPackageKeyTuple(input: BuildRevenueCycleCommandCenterPackageInput): string {
  return input.packageKeyTuple ?? `${input.period ?? ""}_${input.organizationalUnitId ?? ""}_${getInputSnapshotHash(input)}`;
}

function collectMissingRequiredIdentifiers(input: BuildRevenueCycleCommandCenterPackageInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.organizationalUnitId)) {
    missing.push("organizationalUnitId");
  }

  if (!hasValue(input.period)) {
    missing.push("period");
  }

  if (getIsHealthcareUnit(input.isHealthcareUnit)) {
    if (!input.customerIsolation) {
      missing.push("customerIsolation");
    }

    if (!input.firmIsolation) {
      missing.push("firmIsolation");
    }

    if (!input.clientIsolation) {
      missing.push("clientIsolation");
    }
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

function buildRevenueCycleCommandCenterPackageDerivationHash(
  input: BuildRevenueCycleCommandCenterPackageInput,
): string {
  return stableSnapshotHash({
    organizationalUnitId: input.organizationalUnitId ?? "",
    period: input.period ?? "",
    isHealthcareUnit: getIsHealthcareUnit(input.isHealthcareUnit),
    denialReferenceIds: getInputArray(input.denialReferenceIds),
    collectionsReferenceIds: getInputArray(input.collectionsReferenceIds),
    dsoMetadata: getInputRecord(input.dsoMetadata),
    agingMetadata: getInputRecord(input.agingMetadata),
    escalationReferenceIds: getInputArray(input.escalationReferenceIds),
    perPatientDayMetadata: getInputRecord(input.perPatientDayMetadata),
    predictiveAnalysisReferenceIds: getInputArray(input.predictiveAnalysisReferenceIds),
    industryIntelligenceLibraryReferenceId: input.industryIntelligenceLibraryReferenceId ?? "",
    consumedPhase39RoleOutputReferenceIds: getInputArray(input.consumedPhase39RoleOutputReferenceIds),
    itemsRequiringHumanDecisionReferenceIds: getInputArray(input.itemsRequiringHumanDecisionReferenceIds),
    itemsRequiringHumanDecisionCount: getItemsRequiringHumanDecisionCount(input),
    revenueCycleStatusSummary: input.revenueCycleStatusSummary ?? "",
    surfacedToPersonas: getInputArray(input.surfacedToPersonas),
    packageKeyTuple: getPackageKeyTuple(input),
    updateInPlace: true,
    noDuplicateOnRerun: true,
    noTimestampInHashInputs: true,
    containsPHI: getContainsPHI(input),
    phiMarkedWhenHealthcareUnit: true,
    phiArtifactRequiresIsolationFields: true,
    noMixingPhiAndNonPhiInSamePayload: true,
    hipaaControlsDeferredToPhase42_5: true,
    inputSnapshotHash: getInputSnapshotHash(input),
    isStale: getIsStale(input),
    revenueCycleCommandCenterPackageComplete: input.revenueCycleCommandCenterPackageComplete === true,
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildRevenueCycleCommandCenterPackage(
  input: BuildRevenueCycleCommandCenterPackageInput,
): BuildRevenueCycleCommandCenterPackageResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = Array.from(new Set(collectMissingRequiredIdentifiers(input)));

  if (missingRequiredIdentifiers.length > 0) {
    return {
      revenueCycleCommandCenterPackage: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const organizationalUnitId = input.organizationalUnitId as string;
  const period = input.period as string;
  const isHealthcareUnit = getIsHealthcareUnit(input.isHealthcareUnit);
  const containsPHI = getContainsPHI(input);
  const inputSnapshotHash = getInputSnapshotHash(input);
  const isStale = getIsStale(input);
  const packageKeyTuple = getPackageKeyTuple(input);
  const derivationHash = buildRevenueCycleCommandCenterPackageDerivationHash(input);
  const revenueCycleCommandCenterPackageKey = stableSnapshotHash({
    period,
    organizationalUnitId,
    inputSnapshotHash,
    packageKeyTuple,
    noTimestampInHashInputs: true,
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
    revenueCycleCommandCenterPackage: {
      ...base,
      revenueCycleCommandCenterPackageId: stableSnapshotHash({
        revenueCycleCommandCenterPackageKey,
        artifactType: "SyntheticRevenueCycleCommandCenterPackage",
      }),
      revenueCycleCommandCenterPackageKey,
      organizationalUnitId,
      period,
      isHealthcareUnit,
      denialReferenceIds: getInputArray(input.denialReferenceIds),
      collectionsReferenceIds: getInputArray(input.collectionsReferenceIds),
      dsoMetadata: getInputRecord(input.dsoMetadata),
      agingMetadata: getInputRecord(input.agingMetadata),
      escalationReferenceIds: getInputArray(input.escalationReferenceIds),
      perPatientDayMetadata: getInputRecord(input.perPatientDayMetadata),
      predictiveAnalysisReferenceIds: getInputArray(input.predictiveAnalysisReferenceIds),
      industryIntelligenceLibraryReferenceId: input.industryIntelligenceLibraryReferenceId ?? "",
      consumedPhase39RoleOutputReferenceIds: getInputArray(input.consumedPhase39RoleOutputReferenceIds),
      itemsRequiringHumanDecisionReferenceIds: getInputArray(input.itemsRequiringHumanDecisionReferenceIds),
      itemsRequiringHumanDecisionCount: getItemsRequiringHumanDecisionCount(input),
      revenueCycleStatusSummary: input.revenueCycleStatusSummary ?? "",
      surfacedToPersonas: getInputArray(input.surfacedToPersonas),
      packageKeyTuple,
      updateInPlace: true,
      noDuplicateOnRerun: true,
      noTimestampInHashInputs: true,
      containsPHI,
      phiMarkedWhenHealthcareUnit: true,
      phiArtifactRequiresIsolationFields: true,
      noMixingPhiAndNonPhiInSamePayload: true,
      hipaaControlsDeferredToPhase42_5: true,
      inputSnapshotHash,
      isStale,
      revenueCycleCommandCenterPackageComplete: input.revenueCycleCommandCenterPackageComplete === true,
      derivationHash,
    },
    skipped: false,
    warnings,
  };
}
